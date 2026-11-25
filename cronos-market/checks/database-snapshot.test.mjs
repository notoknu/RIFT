import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {mkdtemp,rm,readFile,writeFile,stat} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {snapshot,restore} from '../scripts/database-snapshot.js';
test('consistent snapshot restores data privately and rejects overwrite, tampering and unsafe restore',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rift-snapshot-'));let db;
 try{const source=join(dir,'source.sqlite'),copy=join(dir,'backup.sqlite'),target=join(dir,'restored.sqlite');db=new DatabaseSync(source);db.exec('PRAGMA journal_mode=WAL; CREATE TABLE evidence(id INTEGER PRIMARY KEY,value TEXT); INSERT INTO evidence(value) VALUES(\'real record\')');
 const manifest=await snapshot(source,copy);assert.deepEqual(manifest.tables,['evidence']);assert.equal((await stat(copy)).mode&0o777,0o600);
 await assert.rejects(restore(copy,target),/Stop all/);await restore(copy,target,{stopped:true});const restored=new DatabaseSync(target);assert.equal(restored.prepare('SELECT value FROM evidence').get().value,'real record');restored.close();await assert.rejects(restore(copy,target,{stopped:true}),/destination exists/);await assert.rejects(snapshot(source,copy),/already exists/);
 const bytes=await readFile(copy);bytes[100]^=1;await writeFile(copy,bytes);await assert.rejects(restore(copy,join(dir,'bad.sqlite'),{stopped:true}),/checksum/);
 }finally{db?.close();await rm(dir,{recursive:true,force:true})}
});
test('preexisting manifest cannot leave an orphaned snapshot or overwrite evidence',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rift-snapshot-collision-'));let db;
 try{const source=join(dir,'source.sqlite'),target=join(dir,'backup.sqlite');db=new DatabaseSync(source);db.exec('CREATE TABLE evidence(value TEXT)');await writeFile(target+'.manifest.json','preserved');await assert.rejects(snapshot(source,target),/already exists/);assert.equal(await readFile(target+'.manifest.json','utf8'),'preserved');await assert.rejects(stat(target),{code:'ENOENT'});}finally{db?.close();await rm(dir,{recursive:true,force:true})}
});
test('restore validates schema/table evidence before publishing a destination',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rift-snapshot-schema-'));let db;
 try{const source=join(dir,'source.sqlite'),copy=join(dir,'backup.sqlite'),target=join(dir,'restored.sqlite');db=new DatabaseSync(source);db.exec('CREATE TABLE evidence(value TEXT)');await snapshot(source,copy);const manifest=JSON.parse(await readFile(copy+'.manifest.json','utf8'));manifest.tables=['invented'];await writeFile(copy+'.manifest.json',JSON.stringify(manifest));await assert.rejects(restore(copy,target,{stopped:true}),/table manifest mismatch/);await assert.rejects(stat(target),{code:'ENOENT'});}finally{db?.close();await rm(dir,{recursive:true,force:true})}
});
test('snapshot and restore enforce bounded byte limits and private output',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rift-snapshot-limits-'));let db;
 try{const source=join(dir,'source.sqlite'),copy=join(dir,'backup.sqlite');db=new DatabaseSync(source);db.exec('CREATE TABLE evidence(value TEXT)');await assert.rejects(snapshot(source,copy,{maxBytes:512}),/byte limit/);await assert.rejects(stat(copy),{code:'ENOENT'});await assert.rejects(stat(copy+'.manifest.json'),{code:'ENOENT'});await snapshot(source,copy);await assert.rejects(restore(copy,join(dir,'tiny.sqlite'),{stopped:true,maxBytes:512}),/manifest/);const target=join(dir,'restored.sqlite');await restore(copy,target,{stopped:true});assert.equal((await stat(target)).mode&0o777,0o600);for(const maxBytes of [0,Infinity,1.5,268435457])await assert.rejects(snapshot(source,join(dir,'bad.sqlite'),{maxBytes}),/limit/);}finally{db?.close();await rm(dir,{recursive:true,force:true})}
});
test('invalid checksummed database never publishes and stale WAL/SHM block restore',async()=>{
 const {createHash}=await import('node:crypto');const dir=await mkdtemp(join(tmpdir(),'rift-snapshot-invalid-'));let db;
 try{const source=join(dir,'source.sqlite'),copy=join(dir,'backup.sqlite');db=new DatabaseSync(source);db.exec('CREATE TABLE evidence(value TEXT)');await snapshot(source,copy);
 for(const suffix of ['-wal','-shm']){const target=join(dir,'blocked'+suffix+'.sqlite');await writeFile(target+suffix,'keep');await assert.rejects(restore(copy,target,{stopped:true}),/destination exists/);assert.equal(await readFile(target+suffix,'utf8'),'keep');}
 const bytes=Buffer.alloc(512);await writeFile(copy,bytes);await writeFile(copy+'.manifest.json',JSON.stringify({version:1,bytes:512,sha256:createHash('sha256').update(bytes).digest('hex'),tables:[]}));const target=join(dir,'invalid.sqlite');await assert.rejects(restore(copy,target,{stopped:true}));await assert.rejects(stat(target),{code:'ENOENT'});
 }finally{db?.close();await rm(dir,{recursive:true,force:true})}
});
