import {selectedProjectionOperationalStatus} from './projection-operational-status.js';
import {releaseManifestHandler} from './release-manifest.js';
import {existsSync} from 'node:fs';import {DatabaseSync} from 'node:sqlite';import {trackedCollections} from './collection-config.js';
function databaseState(path,table,{now,maxAgeMs}){
 if(!existsSync(path))return {status:'missing',note:'Configured index has not been created'};const db=new DatabaseSync(path,{readOnly:true});try{const row=db.prepare('SELECT * FROM '+table+' WHERE id=1').get();if(!row)return {status:'initializing'};const timestamp=row.updated??row.updated_at,block=row.last_block,head=row.head,age=timestamp?Math.max(0,now-timestamp):null;return {status:age===null?'initializing':age>maxAgeMs?'stale':'fresh',indexedThrough:block,observedHead:head??null,caughtUp:typeof head==='number'?block>=head-12:null,ageMs:age,lastError:row.error?'Index reports an error; investigate operator logs':null}}catch{return {status:'unavailable',note:'Database schema unavailable'}}finally{db.close()}}
export function operationalStatus(env=process.env,{now=Date.now(),maxAgeMs=600000}={}){
 if(!Number.isFinite(now)||!Number.isSafeInteger(maxAgeMs)||maxAgeMs<60000||maxAgeMs>86400000)throw Error('Invalid freshness bounds');
 const config={now,maxAgeMs},indexes=[];
 if(env.RIFT_PROJECTION_READ_CONFIG_JSON!==undefined){try{const selected=JSON.parse(env.RIFT_PROJECTION_READ_CONFIG_JSON);if(!selected||typeof selected!=='object'||Array.isArray(selected))throw Error('Invalid projection selection');if(Object.keys(selected).length)indexes.push({kind:'projection-read-selection',status:'remote-not-inspected',note:'API projection reads may use remote repositories. Local freshness below does not certify remote publication or readiness.'})}catch{indexes.push({kind:'projection-read-selection',status:'invalid'})}}
 if(env.MARKETPLACE_ADDRESS||env.VITE_MARKETPLACE_ADDRESS)indexes.push({kind:'legacy-market',...databaseState(env.MARKET_INDEX_DB||'data/market-index.sqlite','config',config)});
 if(env.EXCHANGE_ADDRESS)indexes.push({kind:'exchange-v2',...databaseState(env.EXCHANGE_INDEX_DB||'data/exchange.sqlite','exchange_state',config)});
 if(env.INDEX_REGISTERED_COLLECTIONS==='1'&&env.CREATOR_DB_DRIVER==='libsql')indexes.push({kind:'collection-registry',status:'remote-not-inspected',note:'Remote registry requires asynchronous worker resolution; this endpoint does not certify remote job admission or local index freshness'});
 try{for(const collection of trackedCollections({...env,...(env.CREATOR_DB_DRIVER==='libsql'?{INDEX_REGISTERED_COLLECTIONS:'0'}:{})}))indexes.push({kind:'collection',address:collection.address,...databaseState(collection.path,'collection_state',config)})}catch{indexes.push({kind:'collection-configuration',status:'invalid'})}
 const degraded=indexes.some(i=>!['fresh'].includes(i.status)||i.lastError);return {chainId:25,checkedAt:new Date(now).toISOString(),status:indexes.length?(degraded?'degraded':'ok'):'unconfigured',indexes,scope:'Configured local index freshness only. No private paths, credentials, sessions, drafts, notes or report content. Unconfigured services are not certified ready. Backfill/caughtUp is separate from freshness.'};
}
/** One in-flight inspection; request timeouts do not launch replacement work. */
export function statusAPIPlugin({env=process.env,inspect=selectedProjectionOperationalStatus}={}){
 let cached,expires=0,pending,closed=false;
 function read(){if(closed)return Promise.reject(Error('Status closed'));if(cached&&Date.now()<expires)return Promise.resolve(cached);if(!pending)pending=Promise.resolve().then(()=>inspect(env)).then(value=>{cached=value;expires=Date.now()+15000;return value}).finally(()=>{pending=undefined});return pending}
 async function bounded(job){let timer;try{return await Promise.race([job,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Status deadline')),5000)})])}finally{clearTimeout(timer)}}
 return {name:'operational-status',async close(){closed=true;if(pending)try{await pending}catch{}},configureServer(server){
  server.middlewares.use('/api/v1/release',releaseManifestHandler({env}));
  server.middlewares.use('/api/v1/status',async(req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');if(req.method!=='GET'){res.statusCode=405;return res.end('{}')}try{const status=await bounded(read());res.statusCode=status.status==='ok'?200:503;res.end(JSON.stringify(status))}catch{res.statusCode=503;res.end(JSON.stringify({status:'unavailable',chainId:25}))}});
 }};
}
