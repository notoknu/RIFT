import {lstat,realpath} from 'node:fs/promises';
import {lstatSync,realpathSync} from 'node:fs';
import {dirname,isAbsolute,resolve} from 'node:path';
const need=(v,c)=>{if(!v){const e=new Error(c);e.code=c;throw e}};
const pin=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const identifier=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(v);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const canonicalRecoveryPath=p=>typeof p==='string'&&!/[\u0000-\u001f\u007f]/.test(p)&&isAbsolute(p)&&resolve(p)===p;
const suffixes=['-wal','-shm','-journal'];
/** All scalar and reference validation happens before enrollment or store opening. */
export function validateRecoveryCommand(c){
 need(object(c)&&Object.keys(c).every(k=>['version','action','database','manifestFile','manifestSha256','runtimes','maxJobs','timeoutMs','confirm'].includes(k))&&c.version===1&&['inspect','revalidate','enroll','run'].includes(c.action)&&canonicalRecoveryPath(c.database)&&canonicalRecoveryPath(c.manifestFile)&&pin(c.manifestSha256)&&object(c.runtimes),'INVALID_PRODUCT_RECOVERY_CONFIG');
 const refs=Object.entries(c.runtimes);need(refs.length>=1&&refs.length<=64&&refs.every(([key,r])=>identifier(key)&&object(r)&&Object.keys(r).sort().join(',')==='file,sha256'&&canonicalRecoveryPath(r.file)&&pin(r.sha256)),'INVALID_RECOVERY_RUNTIME_REFERENCES');
 need(c.maxJobs===undefined||Number.isInteger(c.maxJobs)&&c.maxJobs>=1&&c.maxJobs<=32,'INVALID_RECOVERY_JOB_BUDGET');need(c.timeoutMs===undefined||Number.isInteger(c.timeoutMs)&&c.timeoutMs>=1&&c.timeoutMs<=45000,'INVALID_RECOVERY_TIME_BUDGET');
 need(c.action!=='revalidate'||c.maxJobs===undefined,'REVALIDATION_HAS_NO_JOB_BUDGET');
 need(['inspect','revalidate'].includes(c.action)?c.confirm===undefined:c.confirm==='ENROLL AND REBUILD DECLARED COLD PROJECTIONS','RECOVERY_WORKFLOW_APPROVAL_REQUIRED');return c;
}
/** Reserve each SQLite main path and sidecar namespace before examining any file.
 * Source aliases are allowed only for repeated references to the same chain config. */
export async function admitRecoveryWorkflowPaths({database,manifestFile,commandFile,runtimeFiles,chainFiles,targets}={}){
 need(canonicalRecoveryPath(database)&&canonicalRecoveryPath(manifestFile)&&Array.isArray(runtimeFiles)&&runtimeFiles.length>=1&&runtimeFiles.length<=64&&Array.isArray(chainFiles)&&chainFiles.length>=1&&chainFiles.length<=64&&Array.isArray(targets)&&targets.length>=2&&targets.length<=128,'INVALID_RECOVERY_PATH_SET');
 const protectedSources=[manifestFile,...runtimeFiles,...new Set(chainFiles),...(commandFile?[commandFile]:[])],sourcePaths=new Set();for(const path of protectedSources){need(canonicalRecoveryPath(path)&&!sourcePaths.has(path),'RECOVERY_SOURCE_PATH_COLLISION');sourcePaths.add(path)}
 const mains=[database,...targets],reserved=new Set();for(const path of mains){need(canonicalRecoveryPath(path),'CANONICAL_RECOVERY_DATABASE_REQUIRED');for(const name of [path,...suffixes.map(s=>path+s)]){need(!reserved.has(name)&&!sourcePaths.has(name),'RECOVERY_SQLITE_NAMESPACE_COLLISION');reserved.add(name)}}
 const directories=new Map(),files=[],identities=new Set();
 for(const path of [...protectedSources,...mains]){
  const parent=dirname(path);if(!directories.has(parent)){const stat=await lstat(parent);need(stat.isDirectory()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0&&await realpath(parent)===parent,'PRIVATE_CANONICAL_RECOVERY_DIRECTORY_REQUIRED');directories.set(parent,{dev:stat.dev,ino:stat.ino})}
  const stat=await lstat(path);need(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&(stat.mode&0o077)===0,'PRIVATE_SINGLE_LINK_RECOVERY_FILE_REQUIRED');const identity=String(stat.dev)+':'+String(stat.ino);need(!identities.has(identity),'RECOVERY_FILE_IDENTITY_COLLISION');identities.add(identity);const source=sourcePaths.has(path);need(stat.size>0&&stat.size<=(source?131072:536870912),'RECOVERY_FILE_SIZE_LIMIT');files.push({path,dev:stat.dev,ino:stat.ino,source,size:stat.size,mtimeMs:stat.mtimeMs,ctimeMs:stat.ctimeMs});
 }
 const sidecars=mains.flatMap(path=>suffixes.map(s=>path+s));
 const check=()=>{
  for(const [path,original]of directories){const stat=lstatSync(path);need(stat.isDirectory()&&!stat.isSymbolicLink()&&stat.dev===original.dev&&stat.ino===original.ino&&(stat.mode&0o077)===0&&realpathSync(path)===path,'RECOVERY_DIRECTORY_IDENTITY_CHANGED')}
  for(const original of files){const stat=lstatSync(original.path);need(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&(stat.mode&0o077)===0&&stat.dev===original.dev&&stat.ino===original.ino,'RECOVERY_FILE_IDENTITY_CHANGED');if(original.source)need(stat.size===original.size&&stat.mtimeMs===original.mtimeMs&&stat.ctimeMs===original.ctimeMs,'RECOVERY_SOURCE_CHANGED');else need(stat.size<=536870912,'RECOVERY_FILE_SIZE_LIMIT')}
  for(const path of sidecars){let stat;try{stat=lstatSync(path)}catch(e){if(e.code==='ENOENT')continue;throw e}need(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&(stat.mode&0o077)===0,'UNSAFE_RECOVERY_SQLITE_SIDECAR')}
 };
 check();return {check,protectedSources:files.filter(f=>f.source).map(f=>f.path),databases:mains,scope:'Cooperative path and identity admission; not an OS-level exclusion of privileged writers or immutable content proof'};
}
