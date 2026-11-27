import {canonicalCompleteBlockLogs,completeBlockReader} from './complete-block-events.js';
import {createHash} from 'node:crypto';
import {ChainReadError,createChainReadQuorum} from './chain-read-quorum.js';
const need=(v,c)=>{if(!v)throw new ChainReadError(c)};
const hex=(v,bytes)=>typeof v==='string'&&new RegExp('^0x[0-9a-f]{'+bytes*2+'}$','i').test(v);
const safe=n=>Number.isSafeInteger(n)&&n>=0;
export function canonicalEventLogs(logs,{address,fromBlock,toBlock,topics}={}){
 need(hex(address,20)&&safe(fromBlock)&&safe(toBlock)&&toBlock>=fromBlock&&toBlock-fromBlock<32&&Array.isArray(topics)&&topics.length===1&&Array.isArray(topics[0])&&topics[0].length>0&&topics[0].length<=32&&topics[0].every(t=>hex(t,32)),'INVALID_EVENT_QUERY');
 need(Array.isArray(logs)&&logs.length<=512,'INVALID_EVENT_RESULTS');const positions=new Set();let bytes=0;
 const allowed=new Set(topics[0].map(t=>t.toLowerCase()));
 const rows=logs.map(l=>{need(l&&!l.removed&&l.address?.toLowerCase()===address.toLowerCase()&&safe(l.blockNumber)&&l.blockNumber>=fromBlock&&l.blockNumber<=toBlock&&safe(l.index)&&hex(l.blockHash,32)&&hex(l.transactionHash,32)&&typeof l.data==='string'&&/^0x(?:[0-9a-f]{2})*$/i.test(l.data)&&l.data.length<=16386&&Array.isArray(l.topics)&&l.topics.length>=1&&l.topics.length<=4&&l.topics.every(t=>hex(t,32))&&allowed.has(l.topics[0].toLowerCase()),'INVALID_EVENT_RESULTS');const key=l.blockNumber+':'+l.index;need(!positions.has(key),'DUPLICATE_EVENT_POSITION');positions.add(key);bytes+=l.data.length/2+32*l.topics.length;need(bytes<=1048576,'EVENT_BYTES_LIMIT');return {address:l.address.toLowerCase(),blockNumber:l.blockNumber,index:l.index,blockHash:l.blockHash.toLowerCase(),transactionHash:l.transactionHash.toLowerCase(),data:l.data.toLowerCase(),topics:l.topics.map(t=>t.toLowerCase())}}).sort((a,b)=>a.blockNumber-b.blockNumber||a.index-b.index);
 return {logs:rows,digest:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};
}
/** Independent exact event-content agreement. No trie proof; no signing or publication. */
export function createEventReadQuorum(options={}){
 const {providers,chainId=25,quorum=2,timeoutMs=5000}=options;
 createChainReadQuorum(options);need(providers.every(p=>typeof p.adapter.getLogs==='function'),'EVENT_PROVIDER_REQUIRED');
 return {receiptLimits:Object.freeze({maxTransactions:options.completeBlockTransactionLimit??256}),...(options.completeBlockEvents?{readCompleteBlockEvents:completeBlockReader(options,canonicalEventLogs)}:{}),async readEvents(query){
  canonicalEventLogs([],query);const pinned=structuredClone(query);
  const rows=await Promise.all(providers.map(async p=>{let timer;try{
   const result=await Promise.race([(async()=>{need(BigInt((await p.adapter.getNetwork()).chainId)===BigInt(chainId),'WRONG_CHAIN');const head=await p.adapter.getBlockNumber();need(safe(head)&&head>=pinned.toBlock,'HEAD_BEHIND_CHECKPOINT');const before=await p.adapter.getBlock(pinned.toBlock);need(before?.number===pinned.toBlock&&hex(before.hash,32),'INVALID_BLOCK');const canonical=canonicalEventLogs(await p.adapter.getLogs(structuredClone(pinned)),pinned);const after=await p.adapter.getBlock(pinned.toBlock);need(after?.number===pinned.toBlock&&after.hash?.toLowerCase()===before.hash.toLowerCase(),'EVENT_CHAIN_CHANGED');return {...canonical,endHash:before.hash.toLowerCase()}})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new ChainReadError('EVENT_PROVIDER_TIMEOUT')),timeoutMs)})]);return {id:p.id,...result};
  }catch{return {id:p.id,unavailable:true}}finally{clearTimeout(timer)}}));
  const valid=rows.filter(r=>!r.unavailable);need(new Set(valid.map(r=>r.endHash+':'+r.digest)).size<=1,'EVENT_PROVIDER_DISAGREEMENT');need(valid.length>=quorum,'EVENT_QUORUM_UNAVAILABLE');
  return {chainId,fromBlock:pinned.fromBlock,toBlock:pinned.toBlock,endHash:valid[0].endHash,digest:valid[0].digest,eventCount:valid[0].logs.length,agreeingProviders:valid.map(r=>r.id),scope:'Independent event-response agreement; not receipt trie or consensus proof'};
 }};
}

export async function verifyPublicationEvents({reader,query,logs,endHash,signal,timeoutMs=15000}={}){
 need(typeof reader?.readEvents==='function'&&hex(endHash,32)&&Number.isInteger(timeoutMs)&&timeoutMs>=1&&timeoutMs<=60000,'INVALID_EVENT_GATE');
 need(!signal?.aborted,'EVENT_AGREEMENT_CANCELLED');const dense=Array.isArray(logs)&&logs.length>512;need(!dense||typeof reader.readCompleteBlockEvents==='function','COMPLETE_BLOCK_READER_REQUIRED');const expected=dense?canonicalCompleteBlockLogs(logs,query,canonicalEventLogs):canonicalEventLogs(logs,query),pinned=structuredClone(query);let timer,onAbort;
 const interrupt=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new ChainReadError('EVENT_AGREEMENT_TIMEOUT')),timeoutMs);onAbort=()=>reject(new ChainReadError('EVENT_AGREEMENT_CANCELLED'));signal?.addEventListener('abort',onAbort,{once:true});if(signal?.aborted)onAbort()});
 try{need(!signal?.aborted,'EVENT_AGREEMENT_CANCELLED');const e=await Promise.race([Promise.resolve().then(()=>dense?reader.readCompleteBlockEvents(pinned):reader.readEvents(pinned)),interrupt]);need(!signal?.aborted,'EVENT_AGREEMENT_CANCELLED');need(!dense||(e?.completeBlock===true&&safe(e.receiptTransactionCount)&&e.receiptTransactionCount<=Math.min(2048,reader.receiptLimits?.maxTransactions??256)&&/^[a-f0-9]{64}$/.test(e.transactionsDigest||'')),'COMPLETE_BLOCK_EVIDENCE_REQUIRED');need(e?.chainId===25&&e.fromBlock===pinned.fromBlock&&e.toBlock===pinned.toBlock&&e.endHash===endHash.toLowerCase()&&e.digest===expected.digest&&e.eventCount===expected.logs.length&&Array.isArray(e.agreeingProviders)&&new Set(e.agreeingProviders).size>=2,'PUBLICATION_EVENT_DISAGREEMENT');return {...e,scope:'Independent event-response and primary-content agreement; no trie proof'};}finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort)}
}
