import {DatabaseSync,backup} from 'node:sqlite';
import {mkdir,chmod,stat,link,readFile,writeFile,unlink} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function integrity(path){const db=new DatabaseSync(path,{readOnly:true});try{const rows=db.prepare('PRAGMA integrity_check').all();if(rows.length!==1||Object.values(rows[0])[0]!=='ok')throw Error('SQLite integrity check failed');return db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r=>r.name)}finally{db.close()}}
export async function snapshot(source,target){
 source=resolve(source);target=resolve(target);if(source===target)throw Error('Source equals target');await stat(source);try{await stat(target);throw Error('Snapshot target already exists')}catch(e){if(e.code!=='ENOENT')throw e}
 await mkdir(dirname(target),{recursive:true,mode:0o700});const temporary=target+'.'+randomUUID()+'.tmp',db=new DatabaseSync(source,{readOnly:true});
 try{await backup(db,temporary);await chmod(temporary,0o600);const tables=integrity(temporary),bytes=await readFile(temporary);await link(temporary,target);await unlink(temporary);const manifest={version:1,createdAt:new Date().toISOString(),bytes:bytes.length,sha256:digest(bytes),tables};await writeFile(target+'.manifest.json',JSON.stringify(manifest,null,2),{mode:0o600,flag:'wx'});return manifest}finally{db.close();await unlink(temporary).catch(()=>{})}
}
export async function restore(source,target,{stopped=false}={}){
 if(!stopped)throw Error('Stop all database readers and writers; explicit stopped acknowledgement required');source=resolve(source);target=resolve(target);if(source===target)throw Error('Source equals target');
 const manifest=JSON.parse(await readFile(source+'.manifest.json','utf8')),bytes=await readFile(source);if(manifest.version!==1||manifest.sha256!==digest(bytes)||manifest.bytes!==bytes.length)throw Error('Snapshot checksum/manifest mismatch');integrity(source);
 // Never replace a live or existing database, and never merge stale WAL pages.
 for(const path of [target,target+'-wal',target+'-shm']){try{await stat(path);throw Error('Restore destination exists (including WAL/SHM); choose a fresh path')}catch(e){if(e.code!=='ENOENT')throw e}}
 await mkdir(dirname(target),{recursive:true,mode:0o700});await writeFile(target,bytes,{flag:'wx',mode:0o600});integrity(target);return {restored:target,tables:manifest.tables};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [mode,source,target,ack]=process.argv.slice(2);if(!['backup','restore'].includes(mode)||!source||!target)throw Error('Usage: database-snapshot.js backup|restore SOURCE TARGET [--services-stopped]');
 console.log(JSON.stringify(mode==='backup'?await snapshot(source,target):await restore(source,target,{stopped:ack==='--services-stopped'}),null,2));
}
