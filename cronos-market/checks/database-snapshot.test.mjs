import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {mkdtemp,rm,readFile,writeFile,stat} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {snapshot,restore} from '../scripts/database-snapshot.js';
test('consistent snapshot restores data privately and rejects overwrite, tampering and unsafe restore',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rift-snapshot-'));let db;
 try{const source=join(dir,'source.sqlite'),copy=join(dir,'backup.sqlite'),target=join(dir,'restored.sqlite');db=new DatabaseSync(source);db.exec('PRAGMA journal_mode=WAL; CREATE TABLE evidence(id INTEGER PRIMARY KEY,value TEXT); INSERT INTO evidence(value) VALUES(\'real record\')');
 const manifest=await snapshot(source,copy);assert.deepEqual(manifest.tables,['evidence']);assert.equal((await stat(copy)).mode&0o777,0o600);
 await assert.rejects(restore(copy,target),/Stop all/);await restore(copy,target,{stopped:true});const restored=new DatabaseSync(target);assert.equal(restored.prepare('SELECT value FROM evidence').get().value,'real record');restored.close();await assert.rejects(restore(copy,target,{stopped:true}),/destination exists/);await assert.rejects(snapshot(source,copy),/already exists/);
 const bytes=await readFile(copy);bytes[100]^=1;await writeFile(copy,bytes);await assert.rejects(restore(copy,join(dir,'bad.sqlite'),{stopped:true}),/checksum/);
 }finally{db?.close();await rm(dir,{recursive:true,force:true})}
});
