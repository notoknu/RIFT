import {AgreementAuditError} from './chain-agreement-audit.js';
import {verifyPublicationEvents} from './chain-event-quorum.js';
import {ChainReadError} from './chain-read-quorum.js';
import {verifyPublicationHeaders} from './chain-publication-gate.js';
import {acquireExchangeReceipts,ReceiptScanError} from './platform-exchange-receipts.js';
import {boundedExchangeRpc,PlatformRpcError} from './platform-exchange-rpc.js';
import {keccak256} from 'ethers';
import {exchangeInterface,EXCHANGE_EVENTS,decodeExchangeLog} from '../shared/exchange.js';
import {platformExchangeBinding,PlatformIndexError} from './platform-exchange-store.js';
const HASH=/^0x[\da-f]{64}$/i;
class SyncError extends Error{constructor(code){super(code);this.name='PlatformExchangeSyncError';this.code=code;}}
const requireThat=(condition,code)=>{if(!condition)throw new SyncError(code)};
const safe=n=>Number.isSafeInteger(n)&&n>=0&&n<Number.MAX_SAFE_INTEGER;
async function header(provider,number){const row=await provider.getBlock(number);requireThat(row&&row.number===number&&HASH.test(row.hash||'')&&(number===0||HASH.test(row.parentHash||'')),'INVALID_RPC_HEADER');return {...row,hash:row.hash.toLowerCase(),parentHash:row.parentHash?.toLowerCase()};}
/** One bounded read-only acquisition step; no loop, signing, migration, worker startup or retries. */
export async function syncPlatformExchange({store,binding,lease,provider,span=128,confirmations=12,signal,rpcTimeoutMs=15000,rpcMaxCalls=2200,acquisition='logs',publishRange,chainReader,eventReader,onAgreement,chainAgreementTimeoutMs=15000}={}){
 try{
  const b=platformExchangeBinding(binding);
  provider=boundedExchangeRpc(provider,{signal,timeoutMs:rpcTimeoutMs,maxCalls:rpcMaxCalls});
  requireThat(Number.isInteger(span)&&span>=1&&span<=2000&&Number.isInteger(confirmations)&&confirmations>=12&&confirmations<=256,'INVALID_SYNC_BOUNDS');
  requireThat(onAgreement===undefined||(typeof onAgreement==='function'&&chainReader&&eventReader),'AUDIT_REQUIRES_COMPLETE_AGREEMENT');
  requireThat(eventReader===undefined||(chainReader&&typeof eventReader?.readEvents==='function'),'EVENT_READER_REQUIRES_HEADER_AGREEMENT');
  requireThat(chainReader===undefined||(typeof chainReader?.readCheckpoint==='function'&&span<=32),'INVALID_CHAIN_AGREEMENT_READER_OR_SPAN');
  requireThat(publishRange===undefined||typeof publishRange==='function','INVALID_PUBLICATION_HANDLER');
  requireThat(['logs','receipts'].includes(acquisition)&&(acquisition!=='receipts'||span<=32),'INVALID_ACQUISITION_MODE_OR_SPAN');
  requireThat(Number((await provider.getNetwork()).chainId)===25,'WRONG_CHAIN');
  const initial=await store.state(b),head=await provider.getBlockNumber();requireThat(safe(head),'INVALID_RPC_HEAD');const target=head-confirmations;
  requireThat(target>=initial.indexedThrough,'RPC_HEAD_REGRESSED');
  let ancestor=initial.indexedThrough,ancestorHash=initial.blockHash,rollbackTo;
  if(ancestor>=b.startBlock){const observed=await header(provider,ancestor);if(observed.hash!==ancestorHash){
   const retained=await store.checkpoints(b);requireThat(retained.coverage.revision===initial.revision,'CHECKPOINT_CHANGED_DURING_ACQUISITION');
   ancestor=b.startBlock-1;ancestorHash=null;let found=false;
   for(const point of retained.items){const canonical=await header(provider,point.block);if(canonical.hash===point.hash){ancestor=point.block;ancestorHash=point.hash;found=true;break;}}
   requireThat(found||retained.items.length<32,'REORG_BEYOND_RECOVERY_WINDOW');rollbackTo={block:ancestor,hash:ancestorHash};
  }}
  const from=ancestor+1,to=Math.min(target,from+span-1);
  if(to<from)return {idle:true,state:initial,observedHead:head,confirmedTarget:target,scope:'No new range committed; no new runtime verification implied'};
  const end=await header(provider,to),boundary=ancestor>=b.startBlock?await header(provider,ancestor):null;
  if(boundary){requireThat(boundary.hash===ancestorHash,'RECOVERY_ANCESTOR_CHANGED');if(to===ancestor+1)requireThat(end.parentHash===ancestorHash,'DISCONNECTED_RPC_HEADER');}
  // Exact runtime at the range boundary. Proxy implementation/admin safety is a separate review.
  const code=await provider.getCode(b.address,to);requireThat(typeof code==='string'&&/^0x(?:[a-f0-9]{2})+$/i.test(code)&&code.length<=2097154,'INVALID_EXCHANGE_RUNTIME');
  requireThat(keccak256(code).toLowerCase()===b.runtimeHash,'EXCHANGE_RUNTIME_MISMATCH');
  const receiptScan=acquisition==='receipts'?await acquireExchangeReceipts(provider,{address:b.address,fromBlock:from,toBlock:to}):null;
  const rawLogs=receiptScan?receiptScan.logs:await provider.getLogs({address:b.address,fromBlock:from,toBlock:to,topics:[EXCHANGE_EVENTS.map(name=>exchangeInterface.getEvent(name).topicHash)]});
  requireThat(Array.isArray(rawLogs),'INVALID_RPC_LOGS');
  // At the repository event cap, force a smaller verified range/receipt strategy rather than risk silent truncation.
  requireThat(receiptScan?rawLogs.length<=512:rawLogs.length<512,'DENSE_RANGE_REQUIRES_SMALLER_SPAN_OR_RECEIPTS');
  // Detach provider-owned Log objects before asynchronous header verification.
  const logs=rawLogs.map(log=>({address:log?.address,blockNumber:log?.blockNumber,index:log?.index,blockHash:log?.blockHash,transactionHash:log?.transactionHash,removed:log?.removed,data:log?.data,topics:Array.isArray(log?.topics)?[...log.topics]:log?.topics}));
  const keys=new Set(),positions=new Set(),blocks=new Map();let bytes=0;
  for(const log of logs){
   requireThat(log&&!log.removed&&log.address?.toLowerCase()===b.address&&safe(log.blockNumber)&&log.blockNumber>=from&&log.blockNumber<=to&&safe(log.index)&&HASH.test(log.transactionHash||'')&&HASH.test(log.blockHash||''),'INVALID_RPC_EVENT');
   requireThat(typeof log.data==='string'&&/^0x(?:[a-f0-9]{2})*$/i.test(log.data)&&log.data.length<=16386&&Array.isArray(log.topics)&&log.topics.length>=1&&log.topics.length<=4&&log.topics.every(t=>HASH.test(t)),'INVALID_RPC_EVENT_ENCODING');
   bytes+=log.data.length/2+32*log.topics.length;requireThat(bytes<=1048576,'RPC_EVENT_BYTES_LIMIT');
   const key=log.transactionHash.toLowerCase()+':'+log.index,pos=log.blockNumber+':'+log.index;
   requireThat(!keys.has(key)&&!positions.has(pos),'DUPLICATE_RPC_EVENT');keys.add(key);positions.add(pos);
   const hash=log.blockHash.toLowerCase();requireThat(!blocks.has(log.blockNumber)||blocks.get(log.blockNumber)===hash,'CONFLICTING_RPC_BLOCK_HASHES');blocks.set(log.blockNumber,hash);
   try{decodeExchangeLog(log)}catch{throw new SyncError('UNKNOWN_EXCHANGE_EVENT')}
  }
  // Traverse every header, including empty blocks; connect events to one observed ancestry.
  const chain=new Array(to-from+1);let cursor=from;
  const checked=await Promise.allSettled(Array.from({length:Math.min(4,chain.length)},async()=>{while(cursor<=to){const number=cursor++;chain[number-from]=await header(provider,number);}}));
  const failure=checked.find(r=>r.status==='rejected');if(failure)throw failure.reason;
  for(let i=0;i<chain.length;i++){
   const observed=chain[i],previous=i?chain[i-1].hash:boundary?.hash;
   if(receiptScan)requireThat(receiptScan.headers.get(observed.number)===observed.hash,'RECEIPT_CHAIN_CHANGED');
   if(previous)requireThat(observed.parentHash===previous,'DISCONNECTED_RPC_HEADER');
   if(blocks.has(observed.number))requireThat(observed.hash===blocks.get(observed.number),'NONCANONICAL_RPC_EVENT');
  }
  requireThat(chain.at(-1).hash===end.hash,'CHAIN_CHANGED_DURING_ACQUISITION');
  requireThat((await header(provider,to)).hash===end.hash,'CHAIN_CHANGED_DURING_ACQUISITION');
  if(boundary)requireThat((await header(provider,ancestor)).hash===ancestorHash,'RECOVERY_ANCESTOR_CHANGED');
  const chainAgreement=chainReader?await verifyPublicationHeaders({reader:chainReader,headers:boundary?[boundary,...chain]:chain,chainId:b.chainId,signal,timeoutMs:chainAgreementTimeoutMs}):null;
  const eventAgreement=eventReader?await verifyPublicationEvents({reader:eventReader,query:{address:b.address,fromBlock:from,toBlock:to,topics:[EXCHANGE_EVENTS.map(name=>exchangeInterface.getEvent(name).topicHash)]},logs,endHash:end.hash,signal,timeoutMs:chainAgreementTimeoutMs}):null;
  const agreementAudit=onAgreement?await onAgreement(structuredClone({binding:{chainId:25,address:b.address,startBlock:b.startBlock,runtimeHash:b.runtimeHash},expected:initial,fromBlock:from,toBlock:to,blockHash:end.hash,chainAgreement,eventAgreement})):null;
  const latest=await store.state(b);requireThat(latest.revision===initial.revision&&latest.indexedThrough===initial.indexedThrough&&latest.blockHash===initial.blockHash,'CHECKPOINT_CHANGED_DURING_ACQUISITION');
  provider.check(); // Last cancellation gate; once publication starts its outcome must be reconciled, never raced.
  const request={lease,expected:initial,toBlock:to,blockHash:end.hash,logs,...rollbackTo?{rollbackTo}:{}};
  let state;try{state=await (publishRange?publishRange(b,request,{signal}):store.commitRange(b,request));}catch(error){if(publishRange){const wrapped=new PlatformIndexError('PUBLICATION_HANDLER_STOPPED');wrapped.publicationCode=/^[A-Z_]{1,80}$/.test(error?.code||'')?error.code:'PUBLICATION_FAILED';throw wrapped;}throw error;}
  return {idle:false,agreementAudit,eventAgreement,chainAgreement,acquisition,receiptTransactions:receiptScan?.transactionCount??null,receiptScope:receiptScan?.scope??null,fromBlock:from,toBlock:to,eventCount:logs.length,rolledBack:!!rollbackTo,state,observedHead:head,confirmedTarget:target,scope:eventAgreement?'Primary runtime acquisition with independent header and event-response agreement; not trie proof, collusion defense, hosted durability or trading acceptance':chainAgreement?'Exact runtime and primary acquisition with independent header agreement; not log completeness, consensus proof, hosted durability or trading acceptance':'Validated against one configured RPC observation and exact runtime; not independent consensus proof, RPC completeness guarantee, hosted durability or trading acceptance'};
 }catch(error){if(error instanceof AgreementAuditError||error instanceof ChainReadError||error instanceof ReceiptScanError||error instanceof SyncError||error instanceof PlatformIndexError||error instanceof PlatformRpcError)throw error;throw new SyncError('EXCHANGE_RPC_OR_ACQUISITION_FAILED');}
}

export {SyncError as PlatformSyncError};
