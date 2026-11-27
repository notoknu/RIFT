import {boundedExchangeRpc} from './platform-exchange-rpc.js';
import {runJournaledExchangeScan} from './platform-exchange-lifecycle.js';
import {beginReceiptStage,advanceReceiptStage,publishReceiptStage} from './platform-exchange-stage.js';
const codeOf=e=>/^[A-Z_]{1,80}$/.test(e?.code||'')?e.code:'DISPATCH_FAILED';
/** Opt-in range-to-stage dispatcher. One owned lease and one RPC budget; never retries a write. */
export async function runPlatformExchangeDispatch({openStore,openJournal,openStages,binding,provider,chainReader,eventReader,onAgreement,chainAgreementTimeoutMs=15000,owner,maxUnits=4,batchSize=32,span=32,confirmations=12,totalTimeoutMs=45000,rpcMaxCalls=2200,rpcTimeoutMs=15000,leaseTtlMs=60000,signal}={}){
 const out={status:'stopped',units:0,completedRanges:0,eventCount:0,lastState:null,stage:null,retryAllowed:false,cleanup:{leaseReleased:false,storesClosed:false}};
 if([openStore,openJournal,openStages].some(f=>typeof f!=='function')||typeof owner!=='string'||!/^[A-Za-z0-9:_-]{1,128}$/.test(owner)||!Number.isInteger(maxUnits)||maxUnits<1||maxUnits>8||!Number.isInteger(batchSize)||batchSize<1||batchSize>32||!Number.isInteger(span)||span<1||span>32||!Number.isInteger(confirmations)||confirmations<12||confirmations>256||!Number.isInteger(totalTimeoutMs)||totalTimeoutMs<1||totalTimeoutMs>45000||!Number.isInteger(leaseTtlMs)||leaseTtlMs<1000||leaseTtlMs>60000){out.reasonCode='INVALID_DISPATCH_BOUNDS';return out}
 if(signal?.aborted){out.reasonCode='RPC_CANCELLED';return out}
 let store,journal,stages,lease;const controller=new AbortController(),abort=()=>controller.abort(),start=Date.now();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();const timer=setTimeout(abort,totalTimeoutMs);
 const progress=s=>{out.stage={id:s.id,version:s.version,phase:s.phase,cursor:s.data.cursor,transactions:s.data.transactions.length,blockNumber:s.data.block.number}};
 try{
  store=await openStore();journal=await openJournal();stages=await openStages();const resources=[store,journal,stages];
  if(resources.some(r=>!r?.client)||new Set(resources.map(r=>r.client)).size!==3){out.reasonCode='INDEPENDENT_DISPATCH_CLIENTS_REQUIRED';return out}
  for(const r of resources)await r.assertSchema();await store.state(binding);
  if((await journal.pending(binding)).length){out.status='recovery-blocked';out.reasonCode='RECOVERY_INTENT_PENDING';return out}
  const rpc=boundedExchangeRpc(provider,{signal:controller.signal,timeoutMs:rpcTimeoutMs,maxCalls:rpcMaxCalls});rpc.check();lease=await store.acquire(binding,owner,{ttlMs:leaseTtlMs});if(!lease){out.status='lease-busy';return out}
  for(let i=0;i<maxUnits;i++){
   rpc.check();lease=await store.renew(binding,lease,{ttlMs:leaseTtlMs});rpc.check();
   if((await journal.pending(binding)).length){out.status='recovery-blocked';out.reasonCode='RECOVERY_INTENT_PENDING';return out}
   const pending=await stages.unresolved(binding);
   if(pending.length>1||pending.some(s=>['publishing','held'].includes(s.phase))){out.status='stage-review-required';out.reasonCode='UNRESOLVED_STAGE_PUBLICATION';return out}
   let stage=pending[0];if(stage){progress(stage);
    if(stage.phase==='acquiring'){stage=await advanceReceiptStage({stages,store,id:stage.id,version:stage.version,provider:rpc,confirmations,batchSize,signal:controller.signal});progress(stage)}
    else {const r=await publishReceiptStage({stages,store,journal,openFresh:openStore,id:stage.id,version:stage.version,lease,provider:rpc,chainReader,eventReader,onAgreement,chainAgreementTimeoutMs,confirmations,signal:controller.signal});out.completedRanges++;out.eventCount+=r.eventCount;out.lastState=r.state;out.stage={...out.stage,phase:'published',version:stage.version+2}}
   }else{
    try{
     const remaining=totalTimeoutMs-(Date.now()-start);rpc.check();if(remaining<1)throw Object.assign(new Error(),{code:'DISPATCH_DEADLINE'});
     const r=await runJournaledExchangeScan({store,journal,binding,lease,provider:rpc,chainReader,eventReader,onAgreement,chainAgreementTimeoutMs,openFresh:openStore,signal:controller.signal,totalTimeoutMs:remaining,rpcMaxCalls,rpcTimeoutMs,acquisition:'receipts',span,confirmations});out.lastState=r.state;
     if(r.idle){out.status='caught-up-observed';return out}out.completedRanges++;out.eventCount+=r.eventCount;
    }catch(e){
     // ONLY this recognized pre-publication acquisition gate admits staging. No semantic/storage retry.
     if(e?.code!=='SINGLE_BLOCK_REQUIRES_REVIEWED_STAGING')throw e;
     if((await journal.pending(binding)).length)throw Object.assign(new Error(),{code:'RECOVERY_INTENT_PENDING'});
     stage=await beginReceiptStage({completeBlockEvents:typeof eventReader?.readCompleteBlockEvents==='function',stages,store,binding,provider:rpc,confirmations,signal:controller.signal});progress(stage);
    }
   }
   out.units++;
  }
  out.status='unit-budget-exhausted';return out;
 }catch(e){out.reasonCode=controller.signal.aborted&&!signal?.aborted&&e?.code==='RPC_CANCELLED'?'DISPATCH_DEADLINE':codeOf(e);if(e?.reasonCode)out.publicationReason=codeOf({code:e.reasonCode});if(controller.signal.aborted&&['RPC_CANCELLED','DISPATCH_DEADLINE','SCAN_DEADLINE_EXCEEDED'].includes(out.reasonCode))out.status=signal?.aborted?'cancelled':'budget-exhausted';return out}
 finally{
  clearTimeout(timer);signal?.removeEventListener('abort',abort);
  if(lease&&store&&!store.closed&&!store.requiresReopen){try{await store.release(binding,lease);out.cleanup.leaseReleased=true}catch{out.cleanup.leaseReleaseRequiresReview=true}}
  const clients=new Set();let closed=true;for(const r of [stages,journal,store])if(r&&!clients.has(r.client||r)){clients.add(r.client||r);try{await r.close()}catch{closed=false}}out.cleanup.storesClosed=closed;
 }
}
