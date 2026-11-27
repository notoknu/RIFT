import {boundedExchangeRpc} from './platform-exchange-rpc.js';
import {runJournaledExchangeScan} from './platform-exchange-lifecycle.js';
const codeOf=error=>/^[A-Z_]{1,80}$/.test(error?.code||'')?error.code:'WORKER_CYCLE_FAILED';
/** Explicit finite worker cycle. Does not bind streams, migrate, start a service or retry writes. */
export async function runPlatformExchangeCycle({openStore,openJournal,binding,provider,chainReader,eventReader,onAgreement,chainAgreementTimeoutMs=15000,owner,maxRanges=4,totalTimeoutMs=45000,rpcMaxCalls=2200,rpcTimeoutMs=15000,leaseTtlMs=60000,signal,acquisition='receipts',span=32,confirmations=12}={}){
 const result={status:'stopped',completedRanges:0,eventCount:0,lastState:null,retryAllowed:false,scope:'Bounded checkpoint progress against one configured RPC observation; not independent completeness, hosted durability or production acceptance',cleanup:{leaseReleased:false,storesClosed:false}};
 if(typeof openStore!=='function'||typeof openJournal!=='function'||typeof owner!=='string'||!/^[A-Za-z0-9:_-]{1,128}$/.test(owner)||!Number.isInteger(maxRanges)||maxRanges<1||maxRanges>8||!Number.isInteger(totalTimeoutMs)||totalTimeoutMs<1||totalTimeoutMs>45000||!Number.isInteger(leaseTtlMs)||leaseTtlMs<1000||leaseTtlMs>60000){result.reasonCode='INVALID_WORKER_CYCLE_BOUNDS';return result;}
 if(signal?.aborted){result.reasonCode='RPC_CANCELLED';return result;}
 let store,journal,lease;const controller=new AbortController(),abort=()=>controller.abort(),start=Date.now();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();const timer=setTimeout(abort,totalTimeoutMs);
 try{
  store=await openStore();journal=await openJournal();
  if(!store||!journal||store===journal||store.client===journal.client){result.reasonCode='INDEPENDENT_WORKER_CLIENTS_REQUIRED';return result;}
  await store.assertSchema();await journal.assertSchema();await store.state(binding);
  if((await journal.pending(binding)).length){result.status='recovery-blocked';result.reasonCode='RECOVERY_INTENT_PENDING';return result;}
  if(controller.signal.aborted){result.reasonCode='RPC_CANCELLED';return result;}
  const rpc=boundedExchangeRpc(provider,{signal:controller.signal,timeoutMs:rpcTimeoutMs,maxCalls:rpcMaxCalls});
  lease=await store.acquire(binding,owner,{ttlMs:leaseTtlMs});
  if(!lease){result.status='lease-busy';return result;}
  for(let index=0;index<maxRanges;index++){
   const remaining=totalTimeoutMs-(Date.now()-start);
   if(remaining<1||controller.signal.aborted){result.status=signal?.aborted?'cancelled':'budget-exhausted';return result;}
   lease=await store.renew(binding,lease,{ttlMs:leaseTtlMs});
   const scan=await runJournaledExchangeScan({store,journal,binding,lease,provider:rpc,chainReader,eventReader,onAgreement,chainAgreementTimeoutMs,openFresh:openStore,signal:controller.signal,totalTimeoutMs:remaining,rpcMaxCalls,rpcTimeoutMs,acquisition,span,confirmations});
   result.lastState=scan.state;
   if(scan.idle){result.status='caught-up-observed';return result;}
   result.completedRanges++;result.eventCount+=scan.eventCount;
  }
  result.status='range-budget-exhausted';return result;
 }catch(error){result.reasonCode=controller.signal.aborted&&!signal?.aborted&&error?.code==='RPC_CANCELLED'?'CYCLE_ACQUISITION_DEADLINE':codeOf(error);if(error?.reasonCode)result.publicationReason=codeOf({code:error.reasonCode});result.status='stopped';return result;}
 finally{
  clearTimeout(timer);signal?.removeEventListener('abort',abort);
  if(lease&&store&&!store.closed&&!store.requiresReopen){try{await store.release(binding,lease);result.cleanup.leaseReleased=true}catch{result.cleanup.leaseReleaseRequiresReview=true}}
  const clients=new Set();let closed=true;
  for(const resource of [journal,store])if(resource&&!clients.has(resource.client||resource)){clients.add(resource.client||resource);try{await resource.close()}catch{closed=false}}
  result.cleanup.storesClosed=closed;
 }
}
