import {reservationForManifest,commitForReservation,unwrapDeliveryManifest,parseReservedCommit} from './multipart-reservation.js';
import {createHash,createHmac,timingSafeEqual,randomUUID} from 'node:crypto';import {createReadStream,constants} from 'node:fs';import {open,lstat,mkdir,writeFile,link,rm} from 'node:fs/promises';import {join,dirname,isAbsolute} from 'node:path';
export class MultipartError extends Error{constructor(code){super(code);this.code=code}}
const need=(v,c)=>{if(!v)throw new MultipartError(c)},sha=b=>createHash('sha256').update(b).digest('hex'),PART=3*1024*1024,MAX=268435456;
const signature=(data,key)=>createHmac('sha256',key).update('rift-multipart-v1\n'+JSON.stringify(data)).digest('hex');
async function boundedBytes(path,max){need(isAbsolute(path||''),'ABSOLUTE_MULTIPART_PATH_REQUIRED');let file;try{file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);const before=await file.stat();need(before.isFile()&&before.nlink===1&&before.size>0&&before.size<=max,'MULTIPART_BOUNDED_REGULAR_FILE_REQUIRED');const buffer=Buffer.alloc(before.size+1);let offset=0;while(offset<buffer.length){const r=await file.read(buffer,offset,buffer.length-offset,offset);if(!r.bytesRead)break;offset+=r.bytesRead}const after=await file.stat();need(offset===before.size&&after.size===before.size&&after.mtimeMs===before.mtimeMs&&after.ctimeMs===before.ctimeMs,'MULTIPART_SOURCE_CHANGED');return buffer.subarray(0,offset)}finally{await file?.close()}}
const filename=i=>String(i).padStart(4,'0')+'.part';
async function sync(path){const f=await open(path,'r');try{await f.sync()}finally{await f.close()}}
async function put(path,bytes){await writeFile(path,bytes,{flag:'wx',mode:0o600});await sync(path)}
function keyCheck(key){need(Buffer.isBuffer(key)&&key.length===32,'MULTIPART_KEY_REQUIRED')}
export async function packMultipartBackup({source,target,key,keyId}={}){
 keyCheck(key);need(/^[A-Za-z0-9_-]{1,64}$/.test(keyId||'')&&isAbsolute(target||'')&&isAbsolute(source||''),'INVALID_MULTIPART_CONFIG');let file;
 try{file=await open(source,constants.O_RDONLY|constants.O_NOFOLLOW);const stat=await file.stat();need(stat.isFile()&&stat.nlink===1&&stat.size>=29&&stat.size<=MAX,'MULTIPART_BOUNDED_REGULAR_FILE_REQUIRED');const header=Buffer.alloc(8),read=await file.read(header,0,8,0);need(read.bytesRead===8&&['RIFTUN01','RIFTDB01','RIFTSP01','RIFTSP02'].includes(header.toString()),'SEALED_BACKUP_REQUIRED');await mkdir(target,{mode:0o700});
  const parts=[],digest=createHash('sha256');let bytes=0,index=0;
  for await(const chunk of createReadStream(source,{fd:file.fd,autoClose:false,start:0,highWaterMark:PART})){bytes+=chunk.length;need(bytes<=MAX&&index<86,'MULTIPART_LIMIT');digest.update(chunk);const body=Buffer.concat([Buffer.from('RIFTPA01'),Buffer.alloc(24),chunk]),name=filename(index++);await put(join(target,name),body);parts.push({file:name,bytes:body.length,sha256:sha(body)})}
  need(bytes===stat.size,'MULTIPART_SOURCE_CHANGED');const data={format:'rift-backup-multipart-v1',keyId,bytes,sha256:digest.digest('hex'),parts};
  // Both passes use the same no-follow descriptor, never a reopened source pathname.
  const reread=createHash('sha256');let count=0;for await(const chunk of createReadStream(source,{fd:file.fd,autoClose:false,start:0})){count+=chunk.length;need(count<=MAX,'MULTIPART_LIMIT');reread.update(chunk)}const after=await file.stat();need(count===bytes&&reread.digest('hex')===data.sha256&&after.size===stat.size&&after.mtimeMs===stat.mtimeMs&&after.ctimeMs===stat.ctimeMs,'MULTIPART_SOURCE_CHANGED');
  const manifest=Buffer.concat([Buffer.from('RIFTPM01'),Buffer.from(JSON.stringify({data,signature:signature(data,key)}))]);await put(join(target,'COMMITTED.riftmanifest'),manifest);await sync(target);return {bytes,parts:parts.length,sha256:data.sha256,committed:true};
 }finally{await file?.close()}
}
export async function inspectMultipartBackup({source,key,keyId}={}){
 keyCheck(key);need(isAbsolute(source||''),'ABSOLUTE_MULTIPART_PATH_REQUIRED');const dir=await lstat(source);need(dir.isDirectory()&&!dir.isSymbolicLink(),'MULTIPART_DIRECTORY_REQUIRED');const path=join(source,'COMMITTED.riftmanifest');const bytes=await boundedBytes(path,32768);return validateManifestBytes(bytes,key,keyId);
}
function validateManifestBytes(bytes,key,keyId){
 keyCheck(key);need(Buffer.isBuffer(bytes)&&bytes.length<=32768,'MULTIPART_MANIFEST_LIMIT');need(bytes.subarray(0,8).toString()==='RIFTPM01','MULTIPART_MANIFEST_REQUIRED');let m;try{m=JSON.parse(bytes.subarray(8))}catch{throw new MultipartError('INVALID_MULTIPART_MANIFEST')}
 const d=m.data;need(d?.format==='rift-backup-multipart-v1'&&d.keyId===keyId&&/^[a-f0-9]{64}$/.test(m.signature||'')&&timingSafeEqual(Buffer.from(m.signature,'hex'),Buffer.from(signature(d,key),'hex')),'MULTIPART_AUTH_FAILED');
 need(Number.isSafeInteger(d.bytes)&&d.bytes>=29&&d.bytes<=MAX&&/^[a-f0-9]{64}$/.test(d.sha256||'')&&Array.isArray(d.parts)&&d.parts.length>=1&&d.parts.length<=86&&d.parts.every((p,i)=>p.file===filename(i)&&Number.isSafeInteger(p.bytes)&&p.bytes>32&&p.bytes<=PART+32&&/^[a-f0-9]{64}$/.test(p.sha256))&&d.parts.reduce((n,p)=>n+p.bytes-32,0)===d.bytes,'INVALID_MULTIPART_MANIFEST');return {data:d,manifestSha256:sha(bytes)};
}
async function pieceBody(source,p){const bytes=await boundedBytes(join(source,p.file),PART+32);need(bytes.length===p.bytes&&sha(bytes)===p.sha256&&bytes.subarray(0,8).toString()==='RIFTPA01'&&bytes.subarray(8,32).equals(Buffer.alloc(24)),'MULTIPART_PIECE_CHANGED');return bytes}
async function piece(source,p){return (await pieceBody(source,p)).subarray(32)}
export async function reassembleMultipartBackup({source,target,key,keyId}={}){
 const {data}=await inspectMultipartBackup({source,key,keyId});need(isAbsolute(target||''),'ABSOLUTE_MULTIPART_PATH_REQUIRED');try{await lstat(target);throw new MultipartError('MULTIPART_TARGET_EXISTS')}catch(e){if(e.code!=='ENOENT')throw e}
 // Verify every signed piece before starting output; verify again while writing against file swaps.
 for(const p of data.parts)await piece(source,p);
 const temp=join(dirname(target),'.rift-assemble-'+randomUUID());let out;
 try{out=await open(temp,'wx',0o600);const digest=createHash('sha256');let total=0;for(const p of data.parts){const bytes=await piece(source,p);digest.update(bytes);total+=bytes.length;await out.writeFile(bytes)}need(total===data.bytes&&digest.digest('hex')===data.sha256,'MULTIPART_REASSEMBLY_MISMATCH');await out.sync();await out.close();out=null;await link(temp,target);await sync(dirname(target));return {assembled:true,bytes:total,sha256:data.sha256,decrypted:false,activated:false};}finally{await out?.close();await rm(temp,{force:true})}
}

export async function enqueueMultipartBackup({source,store,targetId,key,keyId,cohortReservations=false}={}){
 const {data,manifestSha256}=await inspectMultipartBackup({source,key,keyId});need(typeof cohortReservations==='boolean','INVALID_COHORT_RESERVATION_MODE');let enqueued=0,reservationId;const manifest=await boundedBytes(join(source,'COMMITTED.riftmanifest'),32768);need(sha(manifest)===manifestSha256,'MULTIPART_MANIFEST_CHANGED');if(cohortReservations){need(typeof store.requeueForCohort==='function','COHORT_REQUEUE_STORE_REQUIRED');const r=store.enqueue(reservationForManifest(manifest),targetId);reservationId=r.id;store.requeueForCohort(r.id,targetId)}
 for(const p of data.parts){const body=await pieceBody(source,p);const r=store.enqueue(body,targetId);if(cohortReservations)store.requeueForCohort(r.id,targetId);enqueued++}
 const receipt=store.enqueue(cohortReservations?commitForReservation(manifest,reservationId):manifest,targetId);if(cohortReservations)store.requeueForCohort(receipt.id,targetId);return {parts:enqueued,manifestId:receipt.id,...(reservationId?{reservationId}:{}),sourceRetained:true};
}
export async function importMultipartBackup({store,manifestId,target,targetId,key,keyId}={}){
 const manifest=unwrapDeliveryManifest(store.read(manifestId)),{data}=validateManifestBytes(manifest,key,keyId);need(isAbsolute(target||''),'ABSOLUTE_MULTIPART_PATH_REQUIRED');
 const idFor=p=>sha(Buffer.from(targetId+':'+p.sha256));
 for(const p of data.parts){const bytes=store.read(idFor(p));need(bytes.length===p.bytes&&sha(bytes)===p.sha256,'MULTIPART_PIECE_CHANGED')}
 await mkdir(target,{mode:0o700});for(const p of data.parts)await put(join(target,p.file),store.read(idFor(p)));await put(join(target,'COMMITTED.riftmanifest'),manifest);await sync(target);return {imported:true,parts:data.parts.length,sha256:data.sha256,activated:false};
}
/** Local durable sender acknowledgement state for EVERY part, not merely commit manifest. */
export function inspectMultipartDelivery({store,manifestId,targetId,key,keyId}={}){
 const rows=store.inspect(),byId=new Map(rows.map(r=>[r.id,r])),manifest=byId.get(manifestId);need(manifest?.target===targetId,'MULTIPART_DELIVERY_TARGET_REQUIRED');const raw=store.read(manifestId),commit=raw.subarray(0,8).toString()==='RIFTCM01'?parseReservedCommit(raw):null;const {data}=validateManifestBytes(unwrapDeliveryManifest(raw),key,keyId);const reservation=commit?byId.get(commit.reservationId):null;const parts=data.parts.map(p=>{const id=sha(Buffer.from(targetId+':'+p.sha256)),r=byId.get(id);if(r){const body=store.read(id);need(body.length===p.bytes&&sha(body)===p.sha256,'MULTIPART_PART_CHANGED')}return {id,phase:r?.phase??'missing'}});return {manifestId,manifestPhase:manifest.phase,...(commit?{reservationId:commit.reservationId,reservationPhase:reservation?.phase??'missing'}:{}),parts,acknowledged:manifest.phase==='delivered'&&(!commit||reservation?.phase==='delivered')&&parts.every(p=>p.phase==='delivered'),restoreVerified:false,scope:'Local sender-recorded authenticated HTTPS acknowledgement for manifest and every part; not remote restore or retention certification'};
}
