import {advanceExchangeTimeAcquisition} from './exchange-time-acquisition.js';
import {requireMaintenance as need} from './maintenance-jobs.js';
/** Derived evidence work only. A completed maintenance job is not approval. */
export async function runExchangeTimeAcquisitionUnit({spec,runtime,jobs,claim,signal}){
 need(runtime.providerPolicyDigest===spec.providerPolicyDigest,'TIME_ACQUIRE_RUNTIME_CHANGED');const guard=()=>{need(!signal?.aborted,'MAINTENANCE_CANCELLED');jobs.check(claim)};
 const result=await advanceExchangeTimeAcquisition({directory:runtime.directory,image:runtime.image,planDigest:spec.planDigest,providerPolicyDigest:spec.providerPolicyDigest,reader:runtime.reader,quorum:runtime.quorum,maxSamples:spec.maxSamples,timeoutMs:40000,signal,guard});guard();
 return {phase:result.status==='ready'?'ready':'complete',delayMs:result.status==='ready'?1000:0,result:{code:result.status==='ready'?'TIME_EVIDENCE_ACQUISITION_PROGRESS':'TIME_EVIDENCE_CAPTURED_AWAITING_REVIEW',...result,sourceApproved:false,activated:false}};
}
