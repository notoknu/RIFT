import {DatabaseSync,backup} from 'node:sqlite';
import {mkdir,chmod,stat,link,readFile,writeFile,unlink,mkdtemp,rm} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const MAX_BYTES=268435456;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function integrity(path){const db=new DatabaseSync(path,{readOnly:true});try{const rows=db.prepare('PRAGMA integrity_check').all();if(rows.length!==1||Object.values(rows[0])[0]!=='ok')throw Error('SQLite integrity check failed');return db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r=>r.name)}finally{db.close()}}
async function absent(path,message){try{await stat(path);throw Error(message)}catch(e){if(e.code!=='ENOENT')throw e}}
function limits(maxBytes){if(!Number.isSafeInteger(maxBytes)||maxBytes<512||maxBytes>MAX_BYTES)throw Error('Invalid snapshot byte limit')}
export async function snapshot(source,target,{maxBytes=MAX_BYTES}={}){
 limits(maxBytes);source=resolve(source);target=resolve(target);if(source===target)throw Error('Source equals target');await stat(source);
 for(const path of [target,target+'.manifest.json'])await absent(path,'Snapshot target or manifest already exists');
 await mkdir(dirname(target),{recursive:true,mode:0o700});const temporary=target+'.'+randomUUID()+'.tmp',sidecar=temporary+'.manifest.json',db=new DatabaseSync(source,{readOnly:true});let publishedManifest=false,publishedTarget=false;
 try{
  await backup(db,temporary);await chmod(temporary,0o600);
  if((await stat(temporary)).size>maxBytes)throw Error('Snapshot exceeds byte limit');
  const tables=integrity(temporary),bytes=await readFile(temporary);if(bytes.length>maxBytes)throw Error('Snapshot exceeds byte limit');
  const manifest={version:1,createdAt:new Date().toISOString(),bytes:bytes.length,sha256:digest(bytes),tables};
  await writeFile(sidecar,JSON.stringify(manifest,null,2),{mode:0o600,flag:'wx'});
  // Publish without overwrite. If target publication fails, remove only the sidecar we created.
  await link(sidecar,target+'.manifest.json');publishedManifest=true;
  await link(temporary,target);publishedTarget=true;return manifest;
 }catch(error){if(publishedManifest&&!publishedTarget)await unlink(target+'.manifest.json').catch(()=>{});throw error;}
 finally{db.close();await unlink(temporary).catch(()=>{});await unlink(sidecar).catch(()=>{})}
}
export async function restore(source,target,{stopped=false,maxBytes=MAX_BYTES}={}){
 if(!stopped)throw Error('Stop all database readers and writers; explicit stopped acknowledgement required');limits(maxBytes);source=resolve(source);target=resolve(target);if(source===target)throw Error('Source equals target');
 if((await stat(source+'.manifest.json')).size>65536)throw Error('Snapshot manifest exceeds byte limit');
 const manifest=JSON.parse(await readFile(source+'.manifest.json','utf8'));
 if(manifest.version!==1||!Number.isSafeInteger(manifest.bytes)||manifest.bytes<512||manifest.bytes>maxBytes||!/^[a-f0-9]{64}$/.test(manifest.sha256||'')||!Array.isArray(manifest.tables)||manifest.tables.some(t=>typeof t!=='string'))throw Error('Invalid snapshot manifest');
 if((await stat(source)).size!==manifest.bytes)throw Error('Snapshot checksum/manifest mismatch');
 const bytes=await readFile(source);if(bytes.length>maxBytes||manifest.sha256!==digest(bytes)||manifest.bytes!==bytes.length)throw Error('Snapshot checksum/manifest mismatch');
 // Never replace a live or existing database, and never merge stale WAL pages.
 for(const path of [target,target+'-wal',target+'-shm'])await absent(path,'Restore destination exists (including WAL/SHM); choose a fresh path');
 await mkdir(dirname(target),{recursive:true,mode:0o700});const staging=await mkdtemp(join(dirname(target),'.rift-restore-'));
 try{
  // Validate the exact private bytes that will be published, not a mutable source pathname.
  const verified=join(staging,'verified.sqlite');await writeFile(verified,bytes,{flag:'wx',mode:0o600});const tables=integrity(verified);
  if(JSON.stringify(tables)!==JSON.stringify(manifest.tables))throw Error('Snapshot table manifest mismatch');
  await link(verified,target);return {restored:target,tables};
 }finally{await rm(staging,{recursive:true,force:true})}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [mode,source,target,ack]=process.argv.slice(2);if(!['backup','restore'].includes(mode)||!source||!target)throw Error('Usage: database-snapshot.js backup|restore SOURCE TARGET [--services-stopped]');
 console.log(JSON.stringify(mode==='backup'?await snapshot(source,target):await restore(source,target,{stopped:ack==='--services-stopped'}),null,2));
}
