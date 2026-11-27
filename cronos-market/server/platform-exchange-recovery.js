import {candidateEventPolicy} from './candidate-block-profile.js';
import {createHash} from 'node:crypto';
import {decodeExchangeLog} from '../shared/exchange.js';
import {platformExchangeBinding,PlatformIndexError} from './platform-exchange-store.js';
const HASH=/^0x[\da-f]{64}$/i;
const safe=n=>Number.isSafeInteger(n)&&n>=0&&n<Number.MAX_SAFE_INTEGER;
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const fingerprint=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function prepare(binding,request){
 const b=platformExchangeBinding(binding),e=request?.expected,ancestor=request?.rollbackTo?.block??e?.indexedThrough;const policy=candidateEventPolicy(b,request);
 if(!e||!safe(e.revision)||!Number.isSafeInteger(e.indexedThrough)||e.indexedThrough<b.startBlock-1||e.blockHash!==null&&!HASH.test(e.blockHash||'')||!Number.isSafeInteger(ancestor)||ancestor<b.startBlock-1||ancestor>e.indexedThrough||!safe(request.toBlock)||request.toBlock<=ancestor||request.toBlock-ancestor>2000||!HASH.test(request.blockHash||'')||!Array.isArray(request.logs)||request.logs.length>policy.events)throw new PlatformIndexError('INVALID_RECOVERY_CANDIDATE');
 if(request.rollbackTo&&(ancestor>=e.indexedThrough||(ancestor===b.startBlock-1?request.rollbackTo.hash!==null:!HASH.test(request.rollbackTo.hash||''))))throw new PlatformIndexError('INVALID_RECOVERY_ROLLBACK');
 const seen=new Set();let bytes=0;
 const events=request.logs.map(log=>{
  if(!log||log.removed||log.address?.toLowerCase()!==b.address||!safe(log.blockNumber)||log.blockNumber<=ancestor||log.blockNumber>request.toBlock||!safe(log.index)||!HASH.test(log.blockHash||'')||!HASH.test(log.transactionHash||'')||typeof log.data!=='string'||!/^0x(?:[a-f0-9]{2})*$/i.test(log.data)||log.data.length>16386||!Array.isArray(log.topics)||log.topics.length<1||log.topics.length>4||!log.topics.every(t=>HASH.test(t))||(log.blockNumber===request.toBlock&&log.blockHash.toLowerCase()!==request.blockHash.toLowerCase()))throw new PlatformIndexError('INVALID_RECOVERY_EVENT');
  bytes+=log.data.length+log.topics.length*64;if(bytes>policy.bytes*2)throw new PlatformIndexError('RECOVERY_BYTES_LIMIT');
  const pos=log.blockNumber+':'+log.index,tx=log.transactionHash.toLowerCase()+':'+log.index;if(seen.has(pos)||seen.has(tx))throw new PlatformIndexError('DUPLICATE_RECOVERY_EVENT');seen.add(pos);seen.add(tx);
  let decoded;try{decoded=decodeExchangeLog(log)}catch{throw new PlatformIndexError('INVALID_RECOVERY_EVENT')}return {tx:log.transactionHash.toLowerCase(),index:log.index,block:log.blockNumber,hash:log.blockHash.toLowerCase(),...decoded};
 }).sort((a,c)=>a.block-c.block||a.index-c.index);
 return {binding:b,expected:{revision:e.revision,indexedThrough:e.indexedThrough,blockHash:e.blockHash},fromBlock:ancestor+1,toBlock:request.toBlock,blockHash:request.blockHash.toLowerCase(),events,...(request.denseBlock?{denseBlock:structuredClone(request.denseBlock)}:{})};
}
const same=(a,b)=>a.revision===b.revision&&a.indexedThrough===b.indexedThrough&&a.blockHash===b.blockHash;
/** Read-only reconciliation. Matching content is observed, NOT attributed to a particular worker. */
async function observe(candidate,{failedStore,openFresh}){
 let fresh;
 try{
  fresh=await openFresh();if(!fresh||fresh===failedStore||fresh.client&&fresh.client===failedStore?.client)throw Error('not fresh');
  await fresh.assertSchema();const snapshot=await fresh.inspectRange(candidate.binding,candidate);
  if(same(snapshot.state,candidate.expected))return {outcome:'unchanged-observed',state:snapshot.state,retryAllowed:false};
  const intended={revision:candidate.expected.revision+1,indexedThrough:candidate.toBlock,blockHash:candidate.blockHash};
  if(same(snapshot.state,intended))return {outcome:fingerprint(snapshot.events)===fingerprint(candidate.events)?'matching-publication-observed':'conflicting-content-observed',state:snapshot.state,retryAllowed:false};
  return {outcome:'changed-or-superseded',state:snapshot.state,retryAllowed:false};
 }catch{return {outcome:'unresolved',retryAllowed:false};}
 finally{if(fresh&&fresh!==failedStore&&(!fresh.client||fresh.client!==failedStore?.client))try{await fresh.close()}catch{}}
}
export async function reconcilePlatformRange({binding,request,failedStore,openFresh}={}){
 if(typeof openFresh!=='function')throw new PlatformIndexError('FRESH_STORE_FACTORY_REQUIRED');
 const candidate=prepare(binding,request);return observe(candidate,{failedStore,openFresh});
}
/** Explicit internal publication helper: exactly ONE write attempt, no retries or re-acquisition. */
export async function publishPlatformRange({store,binding,request,openFresh}={}){
 if(typeof openFresh!=='function')throw new PlatformIndexError('FRESH_STORE_FACTORY_REQUIRED');
 const candidate=prepare(binding,request);
 try{return {outcome:'committed',state:await store.commitRange(binding,request),retryAllowed:false};}
 catch(error){
  if(!['PLATFORM_INDEX_TRANSACTION_FAILED','STORE_REOPEN_REQUIRED'].includes(error?.code))throw error;
  // Drain/close the failed handle before consulting a new authoritative connection.
  try{await store.close()}catch{}
  return observe(candidate,{failedStore:store,openFresh});
 }
}

export {prepare as preparePlatformRecovery};
