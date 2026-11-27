import {runPlatformExchangeDispatch} from './platform-exchange-dispatch.js';
const codeOf=e=>/^[A-Z_]{1,80}$/.test(e?.code||'')?e.code:'SCHEDULER_FAILED';
/** Explicit finite scheduler over a caller-owned durable queue. Not a deployed daemon. */
export async function runPlatformExchangeSchedule({jobs,runtimes,owner,maxJobs=4,signal}={}){
 const out={status:'stopped',claimed:0,finished:0,items:[],automaticReplay:false};
 if(!jobs||!(runtimes instanceof Map)||typeof owner!=='string'||!/^[A-Za-z0-9:_-]{1,128}$/.test(owner)||!Number.isInteger(maxJobs)||maxJobs<1||maxJobs>8){out.reasonCode='INVALID_SCHEDULER_OPTIONS';return out}
 const seen=[];
 try{
  await jobs.assertSchema();
  for(let i=0;i<maxJobs;i++){
   if(signal?.aborted){out.status='cancelled';return out}
   const claim=await jobs.claim(owner,{ttlMs:60000,exclude:seen});if(!claim){out.status='no-due-jobs';return out}out.claimed++;seen.push(claim.stream);
   const runtime=runtimes.get(claim.stream);let result;
   if(!runtime)result={status:'stopped',reasonCode:'JOB_RUNTIME_NOT_CONFIGURED',cleanup:{storesClosed:true}};
   else result=await runPlatformExchangeDispatch({openStore:runtime.openStore,openJournal:runtime.openJournal,openStages:runtime.openStages,provider:runtime.provider,chainReader:runtime.chainReader,eventReader:runtime.eventReader,onAgreement:runtime.onAgreement,chainAgreementTimeoutMs:runtime.chainAgreementTimeoutMs,binding:claim.binding,owner:'job:'+claim.token,maxUnits:claim.policy.maxUnits,batchSize:claim.policy.batchSize,span:claim.policy.span,confirmations:claim.policy.confirmations,totalTimeoutMs:45000,leaseTtlMs:60000,signal});
   // Completion is persisted even after cancellation; do not race its database write against a timer.
   const finish=await jobs.finish(claim,result);out.finished++;out.items.push({stream:claim.stream,phase:finish.phase,status:result.status,...(result.reasonCode?{reasonCode:result.reasonCode}:{}),completedRanges:result.completedRanges??0,nextDueAt:finish.nextDueAt});
  }
  out.status='job-budget-exhausted';return out;
 }catch(e){out.reasonCode=codeOf(e);return out}
}
