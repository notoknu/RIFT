import {runOwnedProductionWorkflow} from './owned-production-workflow.js';
import {requireMaintenance as need} from './maintenance-jobs.js';
export async function runOwnedProductionUnit({spec,runtime,jobs,claim,signal}){
 need(runtime.request?.requestDigest===spec.requestDigest,'PRODUCER_RUNTIME_CHANGED');const guard=()=>{need(!signal?.aborted,'MAINTENANCE_CANCELLED');jobs.check(claim)};
 const output=await runOwnedProductionWorkflow({...runtime.request,guard});guard();return {phase:'complete',result:{code:'OWNED_DATA_PRODUCED_AWAITING_ACTIVATION',requestDigest:spec.requestDigest,receiptSha256:output.receiptSha256,expiresAt:output.expiresAt,collectionCount:output.collectionCount,candidateCount:output.candidateCount,filesWritten:output.filesWritten,verified:false,activated:false}};
}
