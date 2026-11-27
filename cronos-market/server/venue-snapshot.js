import {ownedPublicDataSelection,ownedVenue} from '../shared/owned-public-data.js';
import {readOwnedPublicData} from './owned-public-data.js';
import {publicDataURL,publicDataSelectionKey,requirePublicDataProviders} from '../shared/public-data-providers.js';
import {publicDataFetch} from './public-data-fetch.js';
import {isAddress} from 'ethers';
import {boundedBytes} from '../shared/creator-service.js';
import {validateVenueResponse,validateNormalizedVenueSnapshot} from '../shared/venue-snapshot.js';
export async function fetchVenueSnapshot(address,{fetcher=publicDataFetch,env=process.env}={}){
 if(!isAddress(address||''))throw Error('Invalid address');
 const url=publicDataURL('ebisu','ranked',{},env);url.search=new URLSearchParams({chain:'25',addresses:address,limit:'1'});
 const response=await fetcher(url,{redirect:'error',credentials:'omit',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Venue unavailable');return validateVenueResponse(JSON.parse(new TextDecoder().decode(await boundedBytes(response,1048576))),address);
}
// In-memory, per process. LRU eviction bounds both positive and negative cache records.
export function createVenueReader({read=fetchVenueSnapshot,now=Date.now,random=Math.random,maxEntries=1000,maxBytes=2097152,maxActive=3,ttlMs=120000,staleMs=3600000}={}){
 if(typeof read!=='function'||typeof now!=='function'||typeof random!=='function'||![maxEntries,maxBytes,maxActive,ttlMs,staleMs].every(Number.isSafeInteger)||maxEntries<1||maxEntries>1000||maxBytes<128||maxBytes>2097152||maxActive<1||maxActive>3||ttlMs<1||staleMs<ttlMs)throw Error('Invalid venue cache limits');
 const records=new Map();let bytes=0,active=0;
 const remove=key=>{const row=records.get(key);if(row){bytes-=row.bytes;records.delete(key);}};
 const victim=exclude=>[...records].find(([key,row])=>key!==exclude&&!row.pending)?.[0];
 const usable=row=>row.json!==null&&now()>=row.observedAt&&now()-row.observedAt<=staleMs;
 const value=(row,stale)=>{const result=JSON.parse(row.json);return stale?{...result,stale:true,warning:'Live venue unavailable; last successful snapshot',staleAgeMs:now()-row.observedAt,retryAfterMs:Math.max(0,row.retryAfter-now())}:result;};
 function fail(code,retryAfterMs=0){throw Object.assign(Error(code==='busy'?'Venue reads busy':'Venue statistics unavailable or cooling down'),{code,retryAfterMs});}
 return {
  diagnostics(){return {records:records.size,bytes,active,maxEntries,maxBytes,maxActive,scope:'Per-process bounded venue cache; no keys, addresses or upstream error details'};},
  async get(address){
   if(!isAddress(address||''))throw Error('Invalid address');const key=address.toLowerCase();let row=records.get(key);
   if(!row){if(records.size>=maxEntries){const oldest=victim(key);if(oldest===undefined)return fail('busy',1000);remove(oldest);}row={json:null,bytes:0,observedAt:0,freshUntil:0,retryAfter:0,failures:0,pending:null};records.set(key,row);}
   else{records.delete(key);records.set(key,row);}
   if(usable(row)&&now()<row.freshUntil)return value(row,false);
   if(row.pending)return row.pending.then(result=>structuredClone(result));
   if(now()<row.retryAfter){if(usable(row))return value(row,true);return fail('unavailable',row.retryAfter-now());}
   if(active>=maxActive){if(usable(row))return value(row,true);return fail('busy',1000);}
   active++;
   row.pending=Promise.resolve().then(async()=>{
    try{
     const result=await read(key);validateNormalizedVenueSnapshot(result,key);const json=JSON.stringify(result),size=Buffer.byteLength(json);if(size>Math.min(8192,maxBytes))throw Error('Venue snapshot exceeds cache budget');
     while(bytes-row.bytes+size>maxBytes){const oldest=victim(key);if(oldest===undefined)throw Error('Venue cache capacity');remove(oldest);}
     bytes=bytes-row.bytes+size;row.json=json;row.bytes=size;row.observedAt=now();row.freshUntil=now()+ttlMs;row.retryAfter=0;row.failures=0;return value(row,false);
    }catch{
     row.failures=Math.min(5,row.failures+1);const base=Math.min(5000*2**(row.failures-1),60000),sample=Number(random());row.retryAfter=now()+base+(Number.isFinite(sample)?Math.floor(Math.max(0,Math.min(1,sample))*base*.2):0);row.freshUntil=0;
     if(usable(row))return value(row,true);return fail('unavailable',row.retryAfter-now());
    }
   }).finally(()=>{active--;row.pending=null;});
   return row.pending.then(result=>structuredClone(result));
  },
 };
}
export function venueSnapshotPlugin(options={}){const env=options.env||process.env,selected=publicDataSelectionKey(env),reader=createVenueReader({...options,read:options.read||((address)=>fetchVenueSnapshot(address,{env}))});return {name:'collection-venue-snapshot',configureServer(server){server.middlewares.use('/api/v1/collection-market',async(req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');if(req.method!=='GET'){res.statusCode=405;return res.end(JSON.stringify({error:'GET required'}));}const address=new URL(req.url,'http://internal').searchParams.get('address');if(!isAddress(address||'')){res.statusCode=400;return res.end(JSON.stringify({error:'Invalid address'}));}try{if(!options.read&&ownedPublicDataSelection(env))return res.end(JSON.stringify(ownedVenue(await readOwnedPublicData(env),address)));if(!options.read){requirePublicDataProviders(['ebisu'],env);if(publicDataSelectionKey(env)!==selected)throw Error('Provider restart required')}res.end(JSON.stringify(await reader.get(address)));}catch(error){res.statusCode=error.code==='busy'?429:503;if(error.retryAfterMs>0)res.setHeader('Retry-After',String(Math.ceil(error.retryAfterMs/1000)));res.end(JSON.stringify({error:error.code==='busy'?'Venue reads busy':'Venue statistics unavailable or cooling down; no substitute totals'}));}});}};}
