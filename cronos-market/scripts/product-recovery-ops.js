import {revalidateRecoveryWorkflow} from '../server/recovery-artifact-revalidation.js';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readPrivateMaintenanceFile,openMaintenanceRuntime} from './maintenance-ops.js';
import {openMaintenanceJobs} from '../server/maintenance-jobs.js';
import {runMaintenanceSchedule} from '../server/maintenance-runner.js';
import {acquireReceiverProcessLease} from '../server/receiver-process-lease.js';
import {validateRecoveryWorkflow,inspectRecoveryWorkflow,enrollReadyRecoveryNodes} from '../server/product-recovery-workflow.js';
import {validateRecoveryCommand,canonicalRecoveryPath,admitRecoveryWorkflowPaths} from '../server/recovery-workflow-admission.js';
const need=(v,c)=>{if(!v){const e=new Error(c);e.code=c;throw e}};
const sha=b=>createHash('sha256').update(b).digest('hex');
async function document(file,expected,max=131072){const bytes=await readPrivateMaintenanceFile(file,max);need(sha(bytes)===expected,'RECOVERY_DOCUMENT_PIN_CHANGED');return JSON.parse(bytes)}
/** No target initialization, live activation or network acquisition is implicit.
 * Enrollment and work start only after complete bounded admission. */
export async function runProductRecoveryOps(config,{env=process.env,signal,commandFile,guard:externalGuard=()=>{}}={}){
 // Work with a detached JSON document, not caller-mutable references across awaits.
 need(typeof externalGuard==='function','INVALID_RECOVERY_EXTERNAL_GUARD');externalGuard();
 const c=validateRecoveryCommand(JSON.parse(JSON.stringify(config)));need(!signal?.aborted,'RECOVERY_WORKFLOW_CANCELLED');
 const manifest=validateRecoveryWorkflow(await document(c.manifestFile,c.manifestSha256)),configs=new Map(),targets=[],runtimeFiles=[],chainFiles=[];
 for(const node of manifest.nodes){externalGuard();const ident=node.spec.runtimeId;need(!configs.has(ident),'RECOVERY_RUNTIME_REUSED_ACROSS_TARGETS');need(Object.hasOwn(c.runtimes,ident),'RECOVERY_RUNTIME_REFERENCE_REQUIRED');const ref=c.runtimes[ident],runtime=await document(ref.file,ref.sha256,32768);need(runtime&&Object.keys(runtime).sort().join(',')==='chainConfigFile,kind,paths,version'&&runtime.version===1&&runtime.kind===node.kind&&Array.isArray(runtime.paths)&&runtime.paths.length===2&&canonicalRecoveryPath(runtime.chainConfigFile),'RECOVERY_RUNTIME_KIND_OR_PATH_MISMATCH');targets.push(...runtime.paths);runtimeFiles.push(ref.file);chainFiles.push(runtime.chainConfigFile);configs.set(ident,runtime)}
 need(Object.keys(c.runtimes).length===configs.size,'UNUSED_RECOVERY_RUNTIME');const admission=await admitRecoveryWorkflowPaths({database:c.database,manifestFile:c.manifestFile,commandFile,runtimeFiles,chainFiles,targets});
 for(const node of manifest.nodes){externalGuard();admission.check();const inspected=await openMaintenanceRuntime(configs.get(node.spec.runtimeId),{env,inspectOnly:true});try{need(inspected.fingerprint===node.spec.runtimeFingerprint,'RECOVERY_RUNTIME_FINGERPRINT_CHANGED')}finally{inspected.close()}}
 admission.check();need(!signal?.aborted,'RECOVERY_WORKFLOW_CANCELLED');const lease=await acquireReceiverProcessLease(c.database),revalidationDeadline=c.action==='revalidate'?Date.now()+(c.timeoutMs??45000):null;let jobs,primaryError;const opened=[];
 const guard=()=>{externalGuard();lease.check();admission.check();need(!signal?.aborted,'RECOVERY_WORKFLOW_CANCELLED');need(revalidationDeadline===null||Date.now()<revalidationDeadline,'RECOVERY_REVALIDATION_DEADLINE_EXCEEDED')};
 try{guard();jobs=await openMaintenanceJobs(c.database,{readOnly:['inspect','revalidate'].includes(c.action)});guard();if(c.action==='inspect')return inspectRecoveryWorkflow({manifest,jobs});if(c.action==='revalidate')return await revalidateRecoveryWorkflow({manifest,jobs,configs,guard});const enrollment=enrollReadyRecoveryNodes({manifest,jobs,guard});if(c.action==='enroll')return {enrolled:enrollment.enrolled,...enrollment.status};need(!enrollment.status.nodes.some(n=>n.dependencyViolation),'RECOVERY_DEPENDENCY_VIOLATION');const runnable=enrollment.status.nodes.filter(n=>n.runnable),runtimes=new Map();
  for(const node of runnable){guard();const spec=manifest.nodes.find(n=>n.id===node.id).spec,runtime=await openMaintenanceRuntime(configs.get(spec.runtimeId),{env});opened.push(runtime);need(runtime.fingerprint===spec.runtimeFingerprint,'RECOVERY_RUNTIME_FINGERPRINT_CHANGED');runtimes.set(spec.runtimeId,runtime)}
  guard();const execution=await runMaintenanceSchedule({jobs,runtimes,include:runnable.map(n=>n.jobId),maxJobs:c.maxJobs??4,timeoutMs:c.timeoutMs??45000,signal,guard});guard();return {enrolled:enrollment.enrolled,execution,...inspectRecoveryWorkflow({manifest,jobs})};
 }catch(e){primaryError=e;throw e}finally{const cleanupErrors=[];for(const runtime of opened.reverse()){try{await runtime.close()}catch(e){cleanupErrors.push(e)}}try{jobs?.close()}catch(e){cleanupErrors.push(e)}try{await lease.release()}catch(e){cleanupErrors.push(e)}if(cleanupErrors.length){if(primaryError){primaryError.cleanupFailed=true;primaryError.cleanupFailureCount=cleanupErrors.length}else{const e=new Error('RECOVERY_WORKFLOW_CLEANUP_FAILED');e.code='RECOVERY_WORKFLOW_CLEANUP_FAILED';e.cleanupFailureCount=cleanupErrors.length;throw e}}}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{need(process.argv.length===3,'USAGE_PRODUCT_RECOVERY_PRIVATE_CONFIG');const commandFile=resolve(process.argv[2]),c=JSON.parse(await readPrivateMaintenanceFile(commandFile,131072));console.log(JSON.stringify(await runProductRecoveryOps(c,{commandFile}),null,2))}catch(e){console.error(JSON.stringify({code:/^[A-Z0-9_]{1,80}$/.test(e.code||'')?e.code:'PRODUCT_RECOVERY_FAILED',cleanupFailed:!!e.cleanupFailed||e.code==='RECOVERY_WORKFLOW_CLEANUP_FAILED',activated:false,note:'Cold targets may contain resumable partial progress. No live swap or whole-product completion is implied.'}));process.exitCode=1}}
