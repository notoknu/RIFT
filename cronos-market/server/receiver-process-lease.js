import {createHash} from 'node:crypto';
import {isAbsolute,resolve,dirname} from 'node:path';
import {lstat} from 'node:fs/promises';
import {lstatSync} from 'node:fs';
import {acquireArchiveLease,inspectArchiveLease,recoverArchiveLease} from './archive-lease.js';
function options(database){if(!isAbsolute(database||'')||resolve(database)!==database)throw Error('CANONICAL_RECEIVER_DATABASE_REQUIRED');return {archiveDir:dirname(database),lockFile:'.rift-process-'+createHash('sha256').update('backup-receiver:'+database).digest('hex')+'.lock'}}
export async function acquireReceiverProcessLease(database){const o=options(database),original=await lstat(database);if(!original.isFile()||original.isSymbolicLink()||original.nlink!==1||(original.mode&0o077)!==0)throw Error('PRIVATE_SINGLE_LINK_RECEIVER_DATABASE_REQUIRED');const lease=await acquireArchiveLease({...o,operation:'backup-receiver-service'});const check=()=>{lease.check();const current=lstatSync(database);if(!current.isFile()||current.isSymbolicLink()||current.nlink!==1||current.ino!==original.ino||current.dev!==original.dev||(current.mode&0o077)!==0)throw Error('RECEIVER_DATABASE_IDENTITY_CHANGED')};try{check();return {check,release:()=>lease.release()}}catch(e){await lease.release();throw e}}
export async function inspectReceiverProcessLease(database){const o=options(database);return inspectArchiveLease(o.archiveDir,{lockFile:o.lockFile})}
export async function recoverReceiverProcessLease(database,approval){if(approval?.confirm!=='REMOVE FENCED RECEIVER PROCESS LOCK')throw Error('RECEIVER_FENCING_APPROVAL_REQUIRED');return recoverArchiveLease({...options(database),approval:{...approval,confirm:'REMOVE FENCED ARCHIVE LOCK'}})}
