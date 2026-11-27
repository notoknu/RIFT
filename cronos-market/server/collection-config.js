import {existsSync} from 'node:fs';import {DatabaseSync} from 'node:sqlite';import {isAddress,ZeroAddress} from 'ethers';
import {readRegisteredCollections,validateRegistryRows,REGISTRY_LIMIT} from './collection-registry.js';
export function explicitCollections(env=process.env){
 let explicit;try{explicit=JSON.parse(env.COLLECTION_INDEXES_JSON||'[]')}catch{throw Error('Invalid COLLECTION_INDEXES_JSON')}
 if(!Array.isArray(explicit)||explicit.length>REGISTRY_LIMIT)throw Error('Maximum 1000 configured collection indexes');return explicit;
}
export function mergeCollectionConfigs(explicit,registered,env=process.env){
 const unique=new Map();for(const row of [...explicit,...registered]){
  if(!row||!isAddress(row.address)||row.address.toLowerCase()===ZeroAddress||!Number.isSafeInteger(row.startBlock)||row.startBlock<0||!['ERC-721','ERC-1155'].includes(row.standard)||row.path!==undefined&&(typeof row.path!=='string'||!row.path||row.path.length>4096||row.path.includes('\0')))throw Error('Each collection requires its real address, deployment block and standard');
  const address=row.address.toLowerCase(),prior=unique.get(address);
  if(prior&&(prior.startBlock!==row.startBlock||prior.standard!==row.standard||row.path&&prior.path!==row.path))throw Error('Conflicting collection index configuration');
  if(!prior)unique.set(address,{address,startBlock:row.startBlock,standard:row.standard,path:row.path||(env.COLLECTION_INDEX_DIR||'data/collections')+'/'+address+'.sqlite'});
  if(unique.size>REGISTRY_LIMIT)throw Error('Maximum 1000 admitted collection indexes');
 }return [...unique.values()];
}
/** Synchronous compatibility for local inspection. Remote registry consumers must use the loader. */
export function trackedCollections(env=process.env){
 const explicit=explicitCollections(env);let registered=[];
 if(env.INDEX_REGISTERED_COLLECTIONS==='1'){
  if((env.CREATOR_DB_DRIVER||'sqlite')==='libsql')throw Error('Remote collection registry requires asynchronous resolution');
  if((env.CREATOR_DB_DRIVER||'sqlite')!=='sqlite')throw Error('Unsupported collection registry driver');
  const path=env.CREATOR_DB||'data/creator.sqlite';if(existsSync(path)){const db=new DatabaseSync(path,{readOnly:true});try{registered=validateRegistryRows(db.prepare('SELECT address,block FROM creator_collections ORDER BY address LIMIT 1001').all());}finally{db.close();}}
 }return mergeCollectionConfigs(explicit,registered,env);
}
/** Per-consumer bounded freshness and failure cooldown; detached results, no stale registry fallback. */
export function createCollectionConfigLoader({env=process.env,read=readRegisteredCollections,now=Date.now,ttlMs=30000,cooldownMs=5000}={}){
 if(!Number.isSafeInteger(ttlMs)||ttlMs<1||ttlMs>60000||!Number.isSafeInteger(cooldownMs)||cooldownMs<1||cooldownMs>30000)throw Error('Invalid registry cache bounds');
 const config={...env};let cached,expires=0,retryAt=0,pending;
 return async function load(){
  const time=now();if(!Number.isFinite(time))throw Error('Invalid registry clock');
  if(cached&&time<expires&&time>=expires-ttlMs)return structuredClone(cached);
  if(pending)return structuredClone(await pending);
  if(time<retryAt&&time>=retryAt-cooldownMs)throw Error('Collection registry temporarily unavailable; retry shortly');
  const job=Promise.resolve().then(async()=>{
   const explicit=explicitCollections(config),registered=config.INDEX_REGISTERED_COLLECTIONS==='1'?await read(config):[];
   if(!Array.isArray(registered)||registered.length>REGISTRY_LIMIT)throw Error('Invalid registry result');
   const result=mergeCollectionConfigs(explicit,registered,config);cached=result;expires=now()+ttlMs;retryAt=0;return result;
  }).catch(()=>{cached=undefined;expires=0;retryAt=now()+cooldownMs;throw Error('Collection registry unavailable or invalid; no fallback index admitted');}).finally(()=>{if(pending===job)pending=undefined;});
  pending=job;return structuredClone(await job);
 };
}
