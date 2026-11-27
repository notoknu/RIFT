import {createHash} from 'node:crypto';
import {open,constants,lstat,realpath,mkdtemp,rm,link,writeFile} from 'node:fs/promises';
import {dirname,isAbsolute,join,resolve} from 'node:path';
import {decryptSnapshot} from '../scripts/encrypted-snapshot.js';
import {reassembleMultipartBackup,inspectMultipartBackup} from './backup-multipart.js';

const MAX_SEALED=33554432+8192;
const need=(v,code)=>{if(!v){const e=new Error(code);e.code=code;throw e}};
const digest=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
async function privateDirectory(path){const s=await lstat(path);need(s.isDirectory()&&!s.isSymbolicLink()&&(s.mode&0o077)===0&&await realpath(path)===path,'PRIVATE_CANONICAL_RECOVERY_DIRECTORY_REQUIRED')}
async function absent(path){try{await lstat(path);need(false,'RECOVERY_TARGET_EXISTS')}catch(e){if(e.code!=='ENOENT')throw e}}
async function sync(path){const f=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);try{await f.sync()}finally{await f.close()}}
// Copy from a no-follow descriptor, not a pathname-reopened stream. Hash and bounds
// bind the exact private copy subsequently passed to decryption.
async function capture(source,target,expected,guard){let input,output;try{input=await open(source,constants.O_RDONLY|constants.O_NOFOLLOW);const s=await input.stat();need(s.isFile()&&(s.mode&0o077)===0&&s.size>=29&&s.size<=MAX_SEALED,'PRIVATE_BOUNDED_RECOVERY_ARCHIVE_REQUIRED');output=await open(target,'wx',0o600);const h=createHash('sha256'),buffer=Buffer.alloc(262144);let bytes=0;for(;;){guard();const {bytesRead}=await input.read(buffer,0,buffer.length,null);if(!bytesRead)break;bytes+=bytesRead;need(bytes<=MAX_SEALED,'RECOVERY_ARCHIVE_SIZE_LIMIT');const b=buffer.subarray(0,bytesRead);h.update(b);await output.writeFile(b)}need(bytes===s.size&&h.digest('hex')===expected,'RECOVERY_ARCHIVE_DIGEST_MISMATCH');await output.sync()}finally{await output?.close();await input?.close()}}

async function imageDigest(path,guard){let f;try{f=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);const stat=await f.stat();need(stat.isFile()&&stat.size<=33554432,'RECOVERY_IMAGE_SIZE_LIMIT');const h=createHash('sha256');let size=0;for await(const chunk of f.createReadStream({autoClose:false})){guard();size+=chunk.length;need(size<=33554432,'RECOVERY_IMAGE_SIZE_LIMIT');h.update(chunk)}need(size===stat.size,'RECOVERY_IMAGE_CHANGED');return h.digest('hex')}finally{await f?.close()}}

/** Cold-file recovery only. Caller supplies independently retained archive and image pins.
 * Does not connect to any chain, start a worker, swap a live DB or accept remote recovery proof.
 */
export async function restoreColdSnapshot({source,format='sealed',target,key,keyId,expectedArchiveSha256,expectedImageSha256,expectedCheckpointDigest,guard=()=>{}}={},profile){
 need(profile&&['wallet-index','agreement-audit'].includes(profile.kind)&&typeof profile.inspect==='function','COLD_RECOVERY_PROFILE_REQUIRED');
 need(['sealed','multipart'].includes(format)&&isAbsolute(source||'')&&source===resolve(source)&&isAbsolute(target||'')&&target===resolve(target)&&source!==target,'CANONICAL_RECOVERY_PATHS_REQUIRED');
 need(Buffer.isBuffer(key)&&key.length===32&&digest(expectedArchiveSha256)&&digest(expectedImageSha256)&&(expectedCheckpointDigest===undefined||digest(expectedCheckpointDigest))&&typeof guard==='function',profile.kind==='wallet-index'?'PINNED_WALLET_RECOVERY_REQUIRED':'PINNED_AGREEMENT_RECOVERY_REQUIRED');
 if(format==='multipart')need(/^[A-Za-z0-9_-]{1,64}$/.test(keyId||''),'MULTIPART_RECOVERY_KEY_ID_REQUIRED');
 await privateDirectory(dirname(target));await absent(target);await absent(target+'.recovery.json');for(const suffix of ['-wal','-shm','-journal'])await absent(target+suffix);guard();
 const scratch=await mkdtemp(join(dirname(target),profile.kind==='wallet-index'?'.wallet-restore-':'.audit-restore-'));let published=false,packagingManifestSha256=null;
 try{const sealed=join(scratch,'captured.riftbak');if(format==='sealed')await capture(source,sealed,expectedArchiveSha256,guard);else{await privateDirectory(source);const manifest=await inspectMultipartBackup({source,key,keyId});packagingManifestSha256=manifest.manifestSha256;need(manifest.data.bytes<=MAX_SEALED&&manifest.data.sha256===expectedArchiveSha256,'RECOVERY_MULTIPART_PIN_MISMATCH');guard();const assembled=join(scratch,'assembled.riftbak');await reassembleMultipartBackup({source,target:assembled,key,keyId});await capture(assembled,sealed,expectedArchiveSha256,guard)}
  guard();const image=join(scratch,profile.kind==='wallet-index'?'wallet.sqlite':'audit.sqlite');await decryptSnapshot(sealed,image,key);need(await imageDigest(image,guard)===expectedImageSha256,'RECOVERY_IMAGE_DIGEST_MISMATCH');const summary=await profile.inspect(image);need(await imageDigest(image,guard)===expectedImageSha256,'RECOVERY_INSPECTOR_CHANGED_IMAGE');if(expectedCheckpointDigest!==undefined)need(summary.checkpointDigest===expectedCheckpointDigest,'RECOVERY_CHECKPOINT_PIN_MISMATCH');
  const result={format:profile.kind==='wallet-index'?'rift-wallet-cold-recovery-v1':'rift-agreement-cold-recovery-v1',code:profile.kind==='wallet-index'?'WALLET_COLD_TARGET_RESTORED':'AGREEMENT_COLD_TARGET_RESTORED',target,archiveSha256:expectedArchiveSha256,imageSha256:expectedImageSha256,packagingManifestSha256,...summary,published:true,activated:false,chainVerified:false,remoteRestoreAttested:false,scope:'Pinned encrypted backup restored into a new private cold file; no live swap, signing or independent chain acceptance'};
  const receiptBytes=Buffer.from(JSON.stringify({...result,recordedAt:new Date().toISOString()},null,2)+'\n'),receipt=join(scratch,'recovery.json');await writeFile(receipt,receiptBytes,{flag:'wx',mode:0o600});await sync(receipt);await sync(image);guard();for(const suffix of ['-wal','-shm','-journal'])await absent(target+suffix);await link(image,target);published=true;await sync(dirname(target));await link(receipt,target+'.recovery.json');await sync(dirname(target));
  return {...result,receipt:target+'.recovery.json',receiptSha256:createHash('sha256').update(receiptBytes).digest('hex'),receiptAuthenticated:false};
 }catch(e){e.coldTargetPublished=published;throw e}finally{try{await rm(scratch,{recursive:true,force:true})}catch(e){e.coldTargetPublished=published;throw e}}
}
