import {ownedPublicDataSelection} from '../shared/owned-public-data.js';
import {readOwnedPublicData} from './owned-public-data.js';
import {createCollectionConfigLoader} from './collection-config.js';
import {openConfiguredProjectionReadRepository,configuredProjectionReadSelection} from './projection-read-repository.js';
import {assertProjectionReadRepository,requireProjectionRead as need} from '../shared/projection-read-contract.js';

/** Inspect the same backend selector as public projection APIs, not a local
 * stand-in for remote data. Never include paths, origins or credentials. */
export async function selectedProjectionOperationalStatus(env=process.env,{now=Date.now(),maxAgeMs=600000,maxInspections=16,loadCollections=createCollectionConfigLoader({env}),openRepository=openConfiguredProjectionReadRepository}={}){
 need(Number.isSafeInteger(now)&&Number.isSafeInteger(maxAgeMs)&&maxAgeMs>=60000&&maxAgeMs<=86400000&&Number.isInteger(maxInspections)&&maxInspections>=1&&maxInspections<=64,'PROJECTION_STATUS_CONFIG_INVALID');
 const started=Date.now(),jobs=[],indexes=[];
 const market=env.MARKETPLACE_ADDRESS||env.VITE_MARKETPLACE_ADDRESS;
 if(market)jobs.push({kind:'legacy-market',binding:{address:market,startBlock:Number(env.MARKET_START_BLOCK)},path:env.MARKET_INDEX_DB||'data/market-index.sqlite'});
 if(env.EXCHANGE_ADDRESS)jobs.push({kind:'exchange',binding:{address:env.EXCHANGE_ADDRESS,startBlock:Number(env.EXCHANGE_START_BLOCK)},path:env.EXCHANGE_INDEX_DB||'data/exchange.sqlite'});
 try{for(const c of await loadCollections())jobs.push({kind:'collection',binding:c,path:c.path})}catch{indexes.push({kind:'collection-configuration',status:'unavailable'})}
 // Validate selection even when there are no jobs, and reject unused remote
 // entries instead of silently certifying a configuration the APIs cannot use.
 try{
  configuredProjectionReadSelection({kind:'legacy-market',env});
  if(env.RIFT_PROJECTION_READ_CONFIG_JSON!==undefined){const config=JSON.parse(env.RIFT_PROJECTION_READ_CONFIG_JSON);for(const [kind,entry] of Object.entries(config)){if(kind==='collection'){for(const address of Object.keys(entry)){if(!jobs.some(j=>j.kind===kind&&j.binding.address.toLowerCase()===address))indexes.push({kind:'collection-selection',status:'unbound'})}}else if(!jobs.some(j=>j.kind===kind))indexes.push({kind:'projection-selection',status:'unbound'})}}
 }catch{indexes.push({kind:'projection-selection',status:'invalid'})}
 const batch=jobs.slice(0,maxInspections),results=new Array(batch.length);let cursor=0;
 async function worker(){while(cursor<batch.length){const i=cursor++,job=batch[i],identity={kind:job.kind==='exchange'?'exchange-v2':job.kind,...(job.kind==='collection'?{address:job.binding.address}:{})};let repository,result;try{
   const selection=configuredProjectionReadSelection({kind:job.kind,binding:job.binding,env});
   repository=await openRepository({...job,env});assertProjectionReadRepository(repository,job.kind);const s=await repository.status();
   need(s&&s.chainId===25&&typeof s.address==='string'&&s.address.toLowerCase()===job.binding.address.toLowerCase()&&s.startBlock===job.binding.startBlock,'PROJECTION_STATUS_BINDING_INVALID');
   const time=s.updatedAt===null?NaN:Date.parse(s.updatedAt),age=Number.isFinite(time)?now+Math.max(0,Date.now()-started)-time:null;
   const validBlock=Number.isSafeInteger(s.indexedThrough)&&s.indexedThrough>=job.binding.startBlock;
   const status=age!==null&&age<0?'invalid':!validBlock||age===null?'initializing':age>maxAgeMs?'stale':'fresh';
   result={...identity,backend:selection.driver,status,indexedThrough:Number.isSafeInteger(s.indexedThrough)?s.indexedThrough:null,blockHash:typeof s.blockHash==='string'&&/^0x[0-9a-f]{64}$/i.test(s.blockHash)?s.blockHash:null,observedHead:Number.isSafeInteger(s.observedHead)?s.observedHead:null,caughtUp:typeof s.caughtUp==='boolean'?s.caughtUp:null,ageMs:age};
   if(validBlock&&!result.blockHash)result.status='invalid';
  }catch{result={...identity,status:'unavailable'}}finally{if(repository)try{await repository.close()}catch{result={...identity,status:'unavailable',cleanupFailed:true}}}results[i]=result}}
 await Promise.all(Array.from({length:Math.min(2,batch.length)},()=>worker()));indexes.push(...results);
 if(jobs.length>batch.length)indexes.push({kind:'projection-inspection-limit',status:'not-inspected',remaining:jobs.length-batch.length});
 try{if(ownedPublicDataSelection(env)){const data=await readOwnedPublicData(env);indexes.push({kind:'owned-public-data',status:'fresh',datasetId:data.datasetId,expiresAt:new Date(data.expiresAt).toISOString(),scope:'Hash-pinned operator publication; not independent semantic verification'})}}catch{indexes.push({kind:'owned-public-data',status:'unavailable'})}
 const degraded=indexes.some(i=>i.status!=='fresh'||i.caughtUp===false);
 return {chainId:25,checkedAt:new Date(now+Math.max(0,Date.now()-started)).toISOString(),status:indexes.length?(degraded?'degraded':'ok'):'unconfigured',indexes,scope:'Selected Node projection backends: schema/binding checks and stored timestamp/checkpoint observations only. Not chain consensus, source-acceptance certification, complete history, remote job health, trading readiness or whole-product readiness. Separate requests are not one cross-database snapshot.'};
}
