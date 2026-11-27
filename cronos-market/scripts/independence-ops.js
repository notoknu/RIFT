import {acquireReceiverProcessLease} from '../server/receiver-process-lease.js';
import {authorizeReservedUpload} from '../server/multipart-reservation.js';
import {packSplitRecoveryFile,unpackSplitRecoveryFile} from '../server/split-recovery-stream.js';
import {createKuboMediaProvider} from '../server/kubo-media-provider.js';
import {replicateVerifiedMedia} from '../server/media-replication.js';
import {openAgreementAudit} from '../server/chain-agreement-audit.js';
import {packMultipartBackup,inspectMultipartBackup,enqueueMultipartBackup,importMultipartBackup,reassembleMultipartBackup} from '../server/backup-multipart.js';
import {readFile,writeFile,lstat} from 'node:fs/promises';import {isAbsolute,resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {createServer} from 'node:http';
import {readUnifiedKey} from '../server/platform-unified-recovery.js';
import {openDeliveryStore,deliverBackupOnce,DeliveryError} from '../server/backup-delivery.js';
import {createBackupHttpsSender,backupReceiverHandler} from '../server/backup-delivery-http.js';
import {createSplitRecoverySet,inspectSplitRecoverySet,planSplitRestore,restoreSplitRecoverySet,packSplitRecoverySet,unpackSplitRecoverySet} from '../server/split-recovery-set.js';
const need=(v,c)=>{if(!v)throw new DeliveryError(c)};
async function boundedJson(path){need(isAbsolute(path||''),'OPS_ABSOLUTE_CONFIG_REQUIRED');const s=await lstat(path);need(s.isFile()&&!s.isSymbolicLink()&&s.size<=32768&&(s.mode&0o077)===0,'OPS_PRIVATE_CONFIG_REQUIRED');return JSON.parse(await readFile(path,'utf8'))}
export async function runIndependenceOps(config,{env=process.env}={}){
 need(config?.version===1,'OPS_VERSION_REQUIRED');const actions=['outbox-prune-plan','outbox-prune','media-replicate','agreement-audit-init','agreement-audit-inspect','multipart-pack','multipart-inspect','multipart-enqueue','multipart-import','multipart-assemble','outbox-init','receiver-init','enqueue','deliver-once','queue-status','export','receive','split-capture','split-inspect','split-plan','split-restore','split-pack','split-unpack','split-pack-file','split-unpack-file'];need(actions.includes(config.action),'OPS_ACTION_REQUIRED');
 if(config.action==='media-replicate'){need(Array.isArray(config.providers)&&config.providers.length>=2&&config.providers.length<=5,'OPS_MEDIA_PROVIDERS_REQUIRED');const stat=await lstat(config.archive);need(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=8388608,'OPS_BOUNDED_ARTIFACT_REQUIRED');const providers=config.providers.map(p=>{need(p.authorizationEnv===undefined||/^RIFT_MEDIA_AUTH_[A-Z0-9_]{1,64}$/.test(p.authorizationEnv),'OPS_MEDIA_AUTH_REFERENCE_REQUIRED');if(p.authorizationEnv)need(typeof env[p.authorizationEnv]==='string'&&env[p.authorizationEnv].length>0,'OPS_MEDIA_AUTH_REQUIRED');return createKuboMediaProvider({...p,authorization:p.authorizationEnv?env[p.authorizationEnv]:undefined})});return await replicateVerifiedMedia({root:config.root,archive:await readFile(config.archive),providers,required:config.required??2,approval:await boundedJson(config.approvalFile)})}
 if(config.action.startsWith('agreement-audit-')){const audit=await openAgreementAudit(config.database,{create:config.action==='agreement-audit-init',readOnly:config.action==='agreement-audit-inspect'});try{return audit.inspect({expectedHead:config.expectedHead,expectedCount:config.expectedCount})}finally{audit.close()}}
 if(['outbox-init','receiver-init','queue-status','outbox-prune-plan','outbox-prune'].includes(config.action)){const store=await openDeliveryStore(config.database,{create:['outbox-init','receiver-init'].includes(config.action),maxTotalBytes:config.maxTotalBytes??67108864});try{if(config.action==='outbox-prune-plan'){const plan=store.planPrune(config.policy);need(isAbsolute(config.planOutput||''),'OPS_ABSOLUTE_OUTPUT_REQUIRED');await writeFile(config.planOutput,JSON.stringify(plan,null,2),{flag:'wx',mode:0o600});return plan}if(config.action==='outbox-prune')return store.pruneDelivered(config.policy,await boundedJson(config.approvalFile));return config.action==='queue-status'?{items:store.inspect()}:{initialized:true}}finally{store.close()}}
 const key=await readUnifiedKey(config.keyFile);let store,receiverLease;
 try{
  if(config.action.startsWith('multipart-')){need(config.cohortReservations===undefined||typeof config.cohortReservations==='boolean','INVALID_COHORT_RESERVATION_MODE');const opts={source:config.source,target:config.target,key,keyId:config.keyId,targetId:config.targetId,cohortReservations:config.cohortReservations??false};if(config.action==='multipart-pack')return await packMultipartBackup(opts);if(config.action==='multipart-inspect')return await inspectMultipartBackup(opts);if(config.action==='multipart-assemble')return await reassembleMultipartBackup(opts);store=await openDeliveryStore(config.database,{maxTotalBytes:config.maxTotalBytes??67108864});if(config.action==='multipart-enqueue')return await enqueueMultipartBackup({...opts,store});return await importMultipartBackup({...opts,store,manifestId:config.manifestId})}
  if(config.action.startsWith('split-')){const approval=config.approvalFile?await boundedJson(config.approvalFile):undefined;const opts={application:config.application,exchange:config.exchange,source:config.source,target:config.target,key,keyId:config.keyId,approval};
   if(config.action==='split-pack-file')return await packSplitRecoveryFile(opts);
   if(config.action==='split-unpack-file')return await unpackSplitRecoveryFile(opts);
   if(config.action==='split-pack'){need(isAbsolute(config.output||''),'OPS_ABSOLUTE_OUTPUT_REQUIRED');const artifact=await packSplitRecoverySet(opts);await writeFile(config.output,artifact,{flag:'wx',mode:0o600});return {packed:true,bytes:artifact.length}}
   if(config.action==='split-unpack'){const s=await lstat(config.source);need(s.isFile()&&!s.isSymbolicLink()&&s.size<=4194304,'OPS_BOUNDED_ARTIFACT_REQUIRED');return await unpackSplitRecoverySet({artifact:await readFile(config.source),target:config.target,key,keyId:config.keyId})}
   if(config.action==='split-capture')return await createSplitRecoverySet(opts);
   if(config.action==='split-inspect')return await inspectSplitRecoverySet(opts);
   if(config.action==='split-plan'){const plan=await planSplitRestore(opts);if(config.planOutput){need(isAbsolute(config.planOutput),'OPS_ABSOLUTE_OUTPUT_REQUIRED');await writeFile(config.planOutput,JSON.stringify(plan),{mode:0o600,flag:'wx'});}return plan}
   return await restoreSplitRecoverySet({...opts,plan:await boundedJson(config.planFile)});
  }
  if(config.action==='receive')receiverLease=await acquireReceiverProcessLease(config.database);
  store=await openDeliveryStore(config.database,{maxTotalBytes:config.maxTotalBytes??67108864});
  if(config.action==='export'){need(isAbsolute(config.output||''),'OPS_ABSOLUTE_OUTPUT_REQUIRED');await writeFile(config.output,store.read(config.id),{flag:'wx',mode:0o600});return {exported:true}}
  if(config.action==='enqueue'){const s=await lstat(config.artifact);need(s.isFile()&&!s.isSymbolicLink()&&s.size<=4194304,'OPS_BOUNDED_ARTIFACT_REQUIRED');return store.enqueue(await readFile(config.artifact),config.targetId)}
  if(config.action==='deliver-once')return await deliverBackupOnce({store,key,keyId:config.keyId,target:config.targetId,timeoutMs:config.timeoutMs??10000,send:createBackupHttpsSender({url:config.url,timeoutMs:config.timeoutMs??10000})});
  need(Number.isInteger(config.port)&&config.port>=1024&&config.port<=65535&&config.bind==='127.0.0.1','OPS_LOCAL_TLS_PROXY_BIND_REQUIRED');
  need(config.requireCohortReservations===undefined||typeof config.requireCohortReservations==='boolean','INVALID_COHORT_RESERVATION_MODE');const server=createServer(backupReceiverHandler({store,target:config.targetId,keyId:config.keyId,key,authorize:receiverLease.check,authorizeBody:config.requireCohortReservations?authorizeReservedUpload:()=>{}}));server.requestTimeout=15000;server.headersTimeout=10000;server.maxHeadersCount=20;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(config.port,config.bind,resolve)});
  process.stdout.write(JSON.stringify({event:'backup-receiver-ready',loopbackOnly:true,tlsProxyRequired:true})+'\n');
  await new Promise(resolve=>{const stop=()=>server.close(resolve);process.once('SIGTERM',stop);process.once('SIGINT',stop)});return {stopped:true};
 }finally{try{store?.close()}finally{try{await receiverLease?.release()}finally{key.fill(0)}}}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{const result=await runIndependenceOps(await boundedJson(process.argv[2]));process.stdout.write(JSON.stringify(result)+'\n')}catch(e){const code=/^[A-Z_]{1,80}$/.test(e.code||'')?e.code:'INDEPENDENCE_OPS_FAILED';process.stderr.write(JSON.stringify({error:code,success:false})+'\n');process.exitCode=1}}
