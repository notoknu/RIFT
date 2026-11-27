import {boundedExchangeRpc} from './platform-exchange-rpc.js';
import {beginReceiptStage,advanceReceiptStage,publishReceiptStage} from './platform-exchange-stage.js';
const codeOf=e=>/^[A-Z_]{1,80}$/.test(e?.code||'')?e.code:'STAGE_CYCLE_FAILED';
/** Explicit finite next-block staging worker. No schema migration, daemon or production selection. */
export async function runPlatformStageCycle({openStore,openJournal,openStages,binding,provider,chainReader,eventReader,onAgreement,chainAgreementTimeoutMs=15000,owner,maxSteps=4,batchSize=32,totalTimeoutMs=45000,rpcMaxCalls=2200,rpcTimeoutMs=15000,leaseTtlMs=60000,confirmations=12,signal}={}){
 const result={status:'stopped',steps:0,completedBlocks:0,eventCount:0,stage:null,retryAllowed:false,cleanup:{leaseReleased:false,storesClosed:false}};
 if([openStore,openJournal,openStages].some(f=>typeof f!=='function')||typeof owner!=='string'||!/^[A-Za-z0-9:_-]{1,128}$/.test(owner)||!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>8||!Number.isInteger(batchSize)||batchSize<1||batchSize>32||!Number.isInteger(totalTimeoutMs)||totalTimeoutMs<1||totalTimeoutMs>45000||!Number.isInteger(leaseTtlMs)||leaseTtlMs<1000||leaseTtlMs>60000||!Number.isInteger(confirmations)||confirmations<12||confirmations>256){result.reasonCode='INVALID_STAGE_CYCLE_BOUNDS';return result}
 if(signal?.aborted){result.reasonCode='RPC_CANCELLED';return result}
 let store,journal,stages,lease;const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();const timer=setTimeout(abort,totalTimeoutMs);
 const progress=s=>{result.stage={id:s.id,version:s.version,phase:s.phase,cursor:s.data.cursor,transactions:s.data.transactions.length,blockNumber:s.data.block.number}};
 try{
  store=await openStore();journal=await openJournal();stages=await openStages();
  const resources=[store,journal,stages];if(resources.some(r=>!r?.client)||new Set(resources.map(r=>r.client)).size!==3){result.reasonCode='INDEPENDENT_STAGE_WORKER_CLIENTS_REQUIRED';return result}
  for(const r of resources)await r.assertSchema();await store.state(binding);
  if((await journal.pending(binding)).length){result.status='recovery-blocked';result.reasonCode='RECOVERY_INTENT_PENDING';return result}
  const rpc=boundedExchangeRpc(provider,{signal:controller.signal,timeoutMs:rpcTimeoutMs,maxCalls:rpcMaxCalls});rpc.check();
  lease=await store.acquire(binding,owner,{ttlMs:leaseTtlMs});if(!lease){result.status='lease-busy';return result}
  const unresolved=await stages.unresolved(binding);
  if(unresolved.some(s=>['held','publishing'].includes(s.phase))||unresolved.length>1){result.status='stage-review-required';result.reasonCode='UNRESOLVED_STAGE_PUBLICATION';return result}
  let stage=unresolved[0];if(stage)progress(stage);
  for(let i=0;i<maxSteps;i++){
   rpc.check();lease=await store.renew(binding,lease,{ttlMs:leaseTtlMs});rpc.check();
   if(!stage){
    const state=await store.state(binding);const head=await rpc.getBlockNumber();if(!Number.isSafeInteger(head)||head<0)throw Object.assign(new Error(),{code:'INVALID_STAGE_HEAD'});
    if(state.indexedThrough>=head-confirmations){result.status='caught-up-observed';return result}
    stage=await beginReceiptStage({completeBlockEvents:typeof eventReader?.readCompleteBlockEvents==='function',stages,store,binding,provider:rpc,confirmations,signal:controller.signal});
   }else if(stage.phase==='acquiring')stage=await advanceReceiptStage({stages,store,id:stage.id,version:stage.version,provider:rpc,confirmations,batchSize,signal:controller.signal});
   else if(stage.phase==='ready'){
    const publication=await publishReceiptStage({stages,store,journal,openFresh:openStore,id:stage.id,version:stage.version,lease,provider:rpc,chainReader,eventReader,onAgreement,chainAgreementTimeoutMs,confirmations,signal:controller.signal});
    result.steps++;result.completedBlocks=1;result.eventCount=publication.eventCount;result.lastState=publication.state;result.stage={...result.stage,phase:'published',version:stage.version+2};result.status='block-published';return result;
   }
   result.steps++;progress(stage);
  }
  result.status='step-budget-exhausted';return result;
 }catch(e){result.reasonCode=controller.signal.aborted&&!signal?.aborted&&e?.code==='RPC_CANCELLED'?'STAGE_CYCLE_DEADLINE':codeOf(e);if(controller.signal.aborted)result.status=signal?.aborted?'cancelled':'budget-exhausted';return result}
 finally{
  clearTimeout(timer);signal?.removeEventListener('abort',abort);
  if(lease&&store&&!store.closed&&!store.requiresReopen){try{await store.release(binding,lease);result.cleanup.leaseReleased=true}catch{result.cleanup.leaseReleaseRequiresReview=true}}
  let closed=true;const clients=new Set();for(const r of [stages,journal,store])if(r&&!clients.has(r.client||r)){clients.add(r.client||r);try{await r.close()}catch{closed=false}}result.cleanup.storesClosed=closed;
 }
}
