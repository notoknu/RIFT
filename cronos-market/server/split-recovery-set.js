import {constants} from 'node:fs';
import {DatabaseSync,backup} from 'node:sqlite';
import {createHash,createHmac,timingSafeEqual,randomUUID,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {realpath,copyFile,mkdir,mkdtemp,readFile,writeFile,rm,lstat,open,link} from 'node:fs/promises';
import {join,isAbsolute} from 'node:path';
import {encryptSnapshot,decryptSnapshot} from '../scripts/encrypted-snapshot.js';
import {createUnifiedBackup,verifyUnifiedBackup,planUnifiedRestore,restoreUnifiedBackup} from './platform-unified-recovery.js';
export class SplitRecoveryError extends Error{constructor(code){super(code);this.code=code}}
const need=(v,c)=>{if(!v)throw new SplitRecoveryError(c)};
const MAX=134217728,sha=b=>createHash('sha256').update(b).digest('hex');
const sign=(data,key)=>createHmac('sha256',key).update('rift-split-set-v1\n'+JSON.stringify(data)).digest('hex');
function keyCheck(key){need(Buffer.isBuffer(key)&&key.length===32,'SPLIT_KEY_REQUIRED')}
async function file(path,max=MAX){const s=await lstat(path);need(s.isFile()&&!s.isSymbolicLink()&&s.size<=max,'SPLIT_REGULAR_BOUNDED_FILE_REQUIRED');return readFile(path)}
async function absent(path){try{await lstat(path);throw new SplitRecoveryError('SPLIT_TARGET_EXISTS')}catch(e){if(e.code!=='ENOENT')throw e}}
async function flush(path){const f=await open(path,'r');try{await f.sync()}finally{await f.close()}}
async function publishJson(path,data){const tmp=path+'.'+randomUUID()+'.tmp';try{await writeFile(tmp,JSON.stringify(data),{mode:0o600,flag:'wx'});await flush(tmp);await link(tmp,path)}finally{await rm(tmp,{force:true})}}
async function offlineDigest(source){need(typeof source==='string'&&isAbsolute(source),'ABSOLUTE_SPLIT_SOURCE_REQUIRED');for(const suffix of ['-wal','-journal'])try{need((await lstat(source+suffix)).size===0,'SPLIT_WRITERS_NOT_QUIESCED')}catch(e){if(e.code!=='ENOENT')throw e}return sha(await file(source))}
function approve(approval,confirm){need(approval?.confirm===confirm&&approval.servicesStopped===true&&/^[A-Za-z0-9_-]{1,64}$/.test(approval.reviewer||'')&&/^[a-f0-9]{64}$/.test(approval.evidenceHash||''),'SPLIT_OFFLINE_APPROVAL_REQUIRED')}
/** Cold, operator-attested quiesced pair. Not a distributed transaction or online snapshot. */
export async function createSplitRecoverySet({application,exchange,target,key,keyId,approval}={}){
 keyCheck(key);approve(approval,'CAPTURE STOPPED SPLIT DATABASES');need(isAbsolute(target||'')&&application!==exchange&&typeof keyId==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(keyId),'INVALID_SPLIT_CONFIG');
 await absent(target);need(await realpath(application)!==await realpath(exchange),'SPLIT_DISTINCT_DATABASES_REQUIRED');const before=[await offlineDigest(application),await offlineDigest(exchange)];await mkdir(target,{mode:0o700});const scratch=await mkdtemp(join(target,'.capture-'));
 try{
  const image=join(scratch,'application.sqlite'),db=new DatabaseSync(application,{readOnly:true});try{await backup(db,image)}finally{db.close()}
  await encryptSnapshot(image,join(target,'application.riftbak'),key);await decryptSnapshot(join(target,'application.riftbak'),join(scratch,'application-readback.sqlite'),key);
  await createUnifiedBackup({source:exchange,target:join(target,'exchange.riftbak'),key,keyId,maxBytes:MAX});
  need(JSON.stringify(before)===JSON.stringify([await offlineDigest(application),await offlineDigest(exchange)]),'SPLIT_SOURCE_CHANGED');
  const components=[];for(const role of ['application','exchange']){const bytes=await file(join(target,role+'.riftbak'));components.push({role,file:role+'.riftbak',bytes:bytes.length,sha256:sha(bytes)})}
  const data={format:'rift-split-recovery-v1',setId:randomUUID(),keyId,components,consistency:'operator-attested-cold-pair',approval:{reviewer:approval.reviewer,evidenceHash:approval.evidenceHash,servicesStopped:true},sourceDigests:before};
  await publishJson(join(target,'COMMITTED.json'),{data,signature:sign(data,key)});await flush(target);
  return {setId:data.setId,manifestHash:sha(Buffer.from(JSON.stringify(data))),committed:true,onlineAtomic:false,offHostVerified:false};
 }finally{await rm(scratch,{recursive:true,force:true})}
}
export async function inspectSplitRecoverySet({source,key,keyId}={}){
 keyCheck(key);need(isAbsolute(source||''),'ABSOLUTE_SPLIT_SOURCE_REQUIRED');const d=await lstat(source);need(d.isDirectory()&&!d.isSymbolicLink(),'SPLIT_DIRECTORY_REQUIRED');
 let manifest;try{manifest=JSON.parse((await file(join(source,'COMMITTED.json'),16384)).toString())}catch{throw new SplitRecoveryError('SPLIT_COMMIT_MANIFEST_REQUIRED')}
 const {data,signature}=manifest;need(data?.format==='rift-split-recovery-v1'&&data.keyId===keyId&&typeof signature==='string'&&/^[a-f0-9]{64}$/.test(signature)&&timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(sign(data,key),'hex')),'SPLIT_MANIFEST_AUTH_FAILED');
 need(Array.isArray(data.components)&&data.components.length===2&&data.components.every((c,i)=>c.role===['application','exchange'][i]&&c.file===c.role+'.riftbak'&&Number.isSafeInteger(c.bytes)&&c.bytes>0&&c.bytes<=MAX&&/^[a-f0-9]{64}$/.test(c.sha256)),'INVALID_SPLIT_COMPONENTS');
 for(const c of data.components){const bytes=await file(join(source,c.file));need(bytes.length===c.bytes&&sha(bytes)===c.sha256,'SPLIT_COMPONENT_CHANGED')}
 return {data,manifestHash:sha(Buffer.from(JSON.stringify(data)))};
}
export async function planSplitRestore({source,target,key,keyId}={}){
 need(isAbsolute(target||''),'ABSOLUTE_SPLIT_TARGET_REQUIRED');await absent(target);const inspected=await inspectSplitRecoverySet({source,key,keyId});return {format:'rift-split-restore-plan-v1',manifestHash:inspected.manifestHash,targetHash:sha(Buffer.from(target)),setId:inspected.data.setId,activated:false};
}
/** Absent-target only, manifest-last, never activates services. Partial target is evidence on failure. */
export async function restoreSplitRecoverySet({source,target,key,keyId,plan,approval}={}){
 keyCheck(key);approve(approval,'RESTORE STOPPED SPLIT COPY');const fresh=await planSplitRestore({source,target,key,keyId});need(JSON.stringify(plan)===JSON.stringify(fresh)&&approval.manifestHash===fresh.manifestHash,'STALE_SPLIT_RESTORE_PLAN');
 // Authenticate/decrypt both components in staging before creating the target directory.
 const scratch=await mkdtemp(join(source,'.restore-'));
 try{
  await decryptSnapshot(join(source,'application.riftbak'),join(scratch,'application.sqlite'),key);
  await verifyUnifiedBackup({source:join(source,'exchange.riftbak'),key,keyId,maxBytes:MAX,workDir:scratch});
  await inspectSplitRecoverySet({source,key,keyId});await mkdir(target,{mode:0o700});
  await copyFile(join(scratch,'application.sqlite'),join(target,'application.sqlite'),constants.COPYFILE_EXCL);
  const handle=await open(join(target,'application.sqlite'),'r+');try{await handle.chmod(0o600)}finally{await handle.close()}
  const exchangeTarget=join(target,'exchange.sqlite'),exchangePlan=await planUnifiedRestore({source:join(source,'exchange.riftbak'),target:exchangeTarget,key,keyId,maxBytes:MAX});
  await restoreUnifiedBackup({source:join(source,'exchange.riftbak'),target:exchangeTarget,key,keyId,maxBytes:MAX,plan:exchangePlan,approval:{confirm:'RESTORE QUARANTINED RIFT COPY',commitment:exchangePlan.planHash,servicesStopped:true,reviewer:approval.reviewer,evidenceHash:approval.evidenceHash}});
  await flush(join(target,'application.sqlite'));await flush(exchangeTarget);
  await publishJson(join(target,'QUARANTINED.json'),{format:'rift-split-restored-v1',setId:fresh.setId,manifestHash:fresh.manifestHash,activated:false,automaticReplay:false,applicationOfflineReviewRequired:true});await flush(target);
  return {setId:fresh.setId,restored:true,quarantined:true,activated:false,automaticReplay:false,offHostVerified:false};
 }finally{await rm(scratch,{recursive:true,force:true})}
}


/** Single encrypted transport artifact for the authenticated split set, bounded for the outbox. */
export async function packSplitRecoverySet({source,key,keyId}={}){
 const inspected=await inspectSplitRecoverySet({source,key,keyId});need(inspected.data.components.reduce((n,c)=>n+c.bytes,0)<=3000000,'USE_STREAMING_SPLIT_TRANSPORT');
 const document={manifest:JSON.parse((await file(join(source,'COMMITTED.json'),16384)).toString()),application:(await file(join(source,'application.riftbak'))).toString('base64'),exchange:(await file(join(source,'exchange.riftbak'))).toString('base64')};
 const plain=Buffer.from(JSON.stringify(document));need(plain.length<=4194304-36,'SPLIT_TRANSPORT_LIMIT');const prefix=Buffer.concat([Buffer.from('RIFTSP01'),randomBytes(12)]),cipher=createCipheriv('aes-256-gcm',key,prefix.subarray(8));cipher.setAAD(prefix);return Buffer.concat([prefix,cipher.update(plain),cipher.final(),cipher.getAuthTag()]);
}
export async function unpackSplitRecoverySet({artifact,target,key,keyId}={}){
 keyCheck(key);need(Buffer.isBuffer(artifact)&&artifact.length>=37&&artifact.length<=4194304&&artifact.subarray(0,8).toString()==='RIFTSP01','INVALID_SPLIT_TRANSPORT');need(isAbsolute(target||''),'ABSOLUTE_SPLIT_TARGET_REQUIRED');await absent(target);let document;
 try{const decipher=createDecipheriv('aes-256-gcm',key,artifact.subarray(8,20));decipher.setAAD(artifact.subarray(0,20));decipher.setAuthTag(artifact.subarray(-16));document=JSON.parse(Buffer.concat([decipher.update(artifact.subarray(20,-16)),decipher.final()]).toString())}catch{throw new SplitRecoveryError('SPLIT_TRANSPORT_AUTH_FAILED')}
 need(document&&typeof document.application==='string'&&typeof document.exchange==='string'&&document.manifest,'INVALID_SPLIT_TRANSPORT');
 // Incomplete imports retain no commit marker and can never authorize restore.
 await mkdir(target,{mode:0o700});for(const role of ['application','exchange'])await writeFile(join(target,role+'.riftbak'),Buffer.from(document[role],'base64'),{flag:'wx',mode:0o600});
 const stage=join(target,'.COMMITTED.validation.json');await writeFile(stage,JSON.stringify(document.manifest),{flag:'wx',mode:0o600});
 // Validate the signature/content before publishing COMMITTED, using the same exact rules.
 const m=document.manifest;need(m.data?.keyId===keyId&&m.data?.format==='rift-split-recovery-v1'&&/^[a-f0-9]{64}$/.test(m.signature||'')&&timingSafeEqual(Buffer.from(m.signature,'hex'),Buffer.from(sign(m.data,key),'hex')),'SPLIT_MANIFEST_AUTH_FAILED');
 need(Array.isArray(m.data.components)&&m.data.components.length===2&&m.data.components.every((c,i)=>c.role===['application','exchange'][i]&&c.file===c.role+'.riftbak'),'INVALID_SPLIT_COMPONENTS');
 for(const c of m.data.components){const bytes=await file(join(target,c.file));need(bytes.length===c.bytes&&sha(bytes)===c.sha256,'SPLIT_COMPONENT_CHANGED');await flush(join(target,c.file))}
 await publishJson(join(target,'COMMITTED.json'),document.manifest);await rm(stage);await flush(target);return {...await inspectSplitRecoverySet({source:target,key,keyId}),imported:true,activated:false};
}
