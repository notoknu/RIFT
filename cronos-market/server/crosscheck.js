import {formatEther} from 'ethers';
import {fileURLToPath} from 'node:url';
import {getDirectory} from './rankings.js';
import {boundedBytes} from '../shared/creator-service.js';
import {createRefreshResource} from './refresh-resource.js';
import {createJsonSnapshot} from './json-snapshot.js';
const ADDRESS=/^0x[a-f0-9]{40}$/;
const positive=value=>value!==null&&/[1-9]/.test(String(value));
function amount(value){if(value===null||value===undefined)return null;if(typeof value==='number'){if(!Number.isFinite(value)||value<0||value>Number.MAX_SAFE_INTEGER)throw Error('Invalid venue amount');value=String(value);}if(typeof value!=='string'||!/^\d{1,78}(?:\.\d{1,18})?$/.test(value))throw Error('Invalid venue amount');return value;}
function image(value){if(value===null||value===undefined)return null;if(typeof value!=='string'||value.length>2048||/\s/.test(value))return null;let url;try{url=new URL(value);}catch{return null;}if(url.protocol!=='https:'||url.username||url.password)return null;return url.href;}
function normalize(row){
 if(row?.chain!==25||typeof row.address!=='string'||!/^0x[a-f0-9]{40}$/i.test(row.address))throw Error('Invalid venue collection');
 const address=row.address.toLowerCase();if(row.name!==undefined&&row.name!==null&&(typeof row.name!=='string'||row.name.length>180)||row.slug!==undefined&&row.slug!==null&&(typeof row.slug!=='string'||row.slug.length>180))throw Error('Invalid venue label');
 let floor=null;if(row.floor!==undefined&&row.floor!==null){if(typeof row.floor!=='string'||!/^\d{1,78}$/.test(row.floor)||BigInt(row.floor)>=2n**256n)throw Error('Invalid venue floor');floor=formatEther(row.floor);}
 const history=row.floorSpark7d??null;if(history!==null&&(!Array.isArray(history)||history.some(v=>v!==null&&(typeof v!=='number'||!Number.isFinite(v)||v<0))))throw Error('Invalid venue history');
 return {address,name:row.name||address,source:'Ebisu’s Bay',imageSource:image(row.image||row.avatar),image:'/api/market-art?address='+address,floorHistory7d:history?.slice(0,32)||null,volumeTotal:amount(row.volumeCroAll),volume7d:amount(row.volumeCro7d),floor,currency:'CRO',url:typeof row.slug==='string'?'https://app.ebisusbay.com/collection/cronos/'+encodeURIComponent(row.slug):'https://app.ebisusbay.com/collections',allTimeRank:null,weeklyRank:null};
}
export function buildComparison({all,week,minted,now=()=>new Date().toISOString()}){
 if(!Array.isArray(all)||all.length>100||!Array.isArray(week)||week.length>100||minted?.chainId!==25||!Array.isArray(minted.collections)||minted.collections.length>200)throw Error('Invalid bounded comparison input');
 const map=new Map();
 for(const [rows,field,volume] of [[all,'allTimeRank','volumeTotal'],[week,'weeklyRank','volume7d']]){const seen=new Set();rows.forEach((raw,index)=>{
  const row=normalize(raw);if(seen.has(row.address))throw Error('Duplicate venue period entry');seen.add(row.address);const prior=map.get(row.address);
  if(prior&&(prior.volumeTotal!==row.volumeTotal||prior.volume7d!==row.volume7d))throw Error('Conflicting venue period observations');
  if(!prior)map.set(row.address,row);const selected=map.get(row.address);if(positive(row[volume]))selected[field]=index+1;
 });}
 const rows=[...map.values()].filter(row=>row.allTimeRank||row.weeklyRank).map(row=>{const match=minted.collections.find(m=>m.address===row.address);return {...row,minted:match?{name:match.name,image:match.image,floor:match.floor,volumeTotal:match.volumeTotal,volume7d:match.volume7d}:null};});
 const result={updatedAt:now(),mintedUpdatedAt:minted.updatedAt,mintedStale:minted.stale===true,collections:rows,matched:rows.filter(r=>r.minted).length,ebisuOnlyInSample:rows.filter(r=>!r.minted).length,stale:false,scope:'Independent source-reported venue snapshots, not an atomic observation. Source numbers may already have provider precision limits. Volumes are not added; missing from a sample does not prove absence. Not executable quotes or RIFT orders.',crovia:{status:'manual-review-only',url:'https://crovia.app/collections',note:'No live Crovia feed is connected; no Crovia totals are added.'}};
 validateComparison(result);return result;
}
export function validateComparison(value){
 if(!value||!Array.isArray(value.collections)||value.collections.length>200||!Number.isFinite(Date.parse(value.updatedAt))||!Number.isFinite(Date.parse(value.mintedUpdatedAt))||typeof value.mintedStale!=='boolean'||value.crovia?.url!=='https://crovia.app/collections'||value.crovia.status!=='manual-review-only')throw Error('Invalid saved comparison');
 const addresses=new Set(),all=new Set(),week=new Set();let matched=0;
 for(const row of value.collections){
  if(!row||typeof row.address!=='string'||!ADDRESS.test(row.address)||addresses.has(row.address)||typeof row.name!=='string'||row.name.length>180||row.source!=='Ebisu’s Bay'||row.image!=='/api/market-art?address='+row.address)throw Error('Invalid saved venue row');addresses.add(row.address);
  if(row.imageSource!==null&&image(row.imageSource)===null)throw Error('Invalid saved venue image');for(const key of ['floor','volumeTotal','volume7d'])amount(row[key]);
  if(typeof row.url!=='string'||!row.url.startsWith('https://app.ebisusbay.com/'))throw Error('Invalid saved venue URL');
  for(const [field,ranks,volume] of [['allTimeRank',all,'volumeTotal'],['weeklyRank',week,'volume7d']])if(row[field]!==null){const rank=row[field];if(!Number.isInteger(rank)||rank<1||rank>100||ranks.has(rank)||!positive(row[volume]))throw Error('Invalid saved venue rank');ranks.add(rank);}
  if(row.allTimeRank===null&&row.weeklyRank===null)throw Error('Unranked saved venue row');
  if(row.floorHistory7d!==null&&(!Array.isArray(row.floorHistory7d)||row.floorHistory7d.length>32||row.floorHistory7d.some(v=>v!==null&&(typeof v!=='number'||!Number.isFinite(v)||v<0))))throw Error('Invalid saved venue history');
  if(row.minted!==null){if(!row.minted||typeof row.minted.name!=='string'||row.minted.name.length>180)throw Error('Invalid saved Minted match');if(row.minted.image!==null&&image(row.minted.image)===null)throw Error('Invalid saved Minted image');for(const key of ['floor','volumeTotal','volume7d'])amount(row.minted[key]);matched++;}
 }
 if(value.matched!==matched||value.ebisuOnlyInSample!==value.collections.length-matched||typeof value.scope!=='string'||value.scope.length>2000)throw Error('Invalid saved comparison counts');return value;
}
export async function fetchComparison({fetcher=globalThis.fetch,readDirectory=getDirectory,now}={}){
 const ranked=async timeframe=>{const response=await fetcher('https://api.wolfswap.gg/factions/ebisus/collections-ranked?chain=25&sortBy=volume&timeframe='+timeframe+'&direction=desc&offset=0&limit=100',{signal:AbortSignal.timeout(20000),redirect:'error',credentials:'omit'});if(!response.ok)throw Error('Venue unavailable');const body=JSON.parse(new TextDecoder().decode(await boundedBytes(response,2097152)));if(body.chain!==25||!Array.isArray(body.rows)||body.rows.length>100)throw Error('Invalid bounded venue response');return body.rows;};
 const [all,week,minted]=await Promise.all([ranked('all'),ranked('7d'),readDirectory()]);return buildComparison({all,week,minted,now});
}
export function createComparisonResource({load=fetchComparison,snapshot=createJsonSnapshot(fileURLToPath(new URL('../data/crosscheck.json',import.meta.url))),...options}={}){return createRefreshResource({load,validate:validateComparison,readSaved:snapshot.read,save:snapshot.save,...options});}
const resource=createComparisonResource();export const crosscheck=()=>resource.get();
export function crosscheckPlugin({read=crosscheck}={}){return {name:'market-crosscheck',configureServer(server){server.middlewares.use('/api/crosscheck',async(req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');if(req.method!=='GET'){res.statusCode=405;return res.end('{}');}try{res.end(JSON.stringify(await read()));}catch(error){res.statusCode=503;if(error.retryAfterMs>0)res.setHeader('Retry-After',String(Math.ceil(error.retryAfterMs/1000)));res.end(JSON.stringify({error:'Cross-market comparison unavailable or cooling down; no substitute figures are shown.'}));}});}};}
