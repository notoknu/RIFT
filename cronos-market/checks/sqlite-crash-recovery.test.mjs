import test from 'node:test';
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {IndexStore} from '../server/index-store.js';
import {snapshot,restore,integrity} from '../scripts/database-snapshot.js';
const wallet='0x'+'1'.repeat(40);
for(const mode of ['committed','uncommitted'])test('actual SIGKILL recovery and independent snapshot restore: '+mode,{timeout:20000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rift-crash-drill-'));let child,store,restored;
 try{
  const source=join(dir,'source.sqlite');
  child=fork(new URL('./fixtures/sqlite-crash-worker.mjs',import.meta.url),[source,mode],{stdio:['ignore','ignore','pipe','ipc'],execArgv:[]});
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{cleanup();reject(Error('Crash worker readiness timed out'));},10000);
   const ready=message=>{if(message?.ready){cleanup();resolve();}};
   const exited=()=>{cleanup();reject(Error('Crash worker exited before readiness'));};
   const error=()=>{cleanup();reject(Error('Crash worker failed'));};
   function cleanup(){clearTimeout(timer);child.off('message',ready);child.off('exit',exited);child.off('error',error);}
   child.on('message',ready);child.once('exit',exited);child.once('error',error);
  });
  assert.ok((await stat(source+'-wal')).size>0);assert.equal((await stat(source)).mode&0o777,0o600);assert.equal((await stat(source+'-wal')).mode&0o777,0o600);
  const exited=once(child,'exit');assert.equal(child.kill('SIGKILL'),true);const [code,signal]=await exited;assert.equal(code,null);assert.equal(signal,'SIGKILL');
  store=new IndexStore(source);assert.equal(store.status(wallet).last,7);assert.equal(store.status(wallet).hash,'0x'+'7'.repeat(64));assert.deepEqual(store.candidates(wallet,'nftTokenBalance').map(row=>row.tokenId),['7']);assert.ok(integrity(source).includes('wallets'));
  const backup=join(dir,'snapshot.sqlite'),destination=join(dir,'independent.sqlite');await snapshot(source,backup);await restore(backup,destination,{stopped:true});restored=new IndexStore(destination);assert.equal(restored.status(wallet).last,7);assert.equal(restored.status(wallet).hash,'0x'+'7'.repeat(64));assert.deepEqual(restored.candidates(wallet,'nftTokenBalance'),store.candidates(wallet,'nftTokenBalance'));
  console.log('SIGKILL/WAL and fresh-path restore verified for disposable local IndexStore; not Android/hosted acceptance: '+mode);
 }finally{
  if(child&&child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill('SIGKILL');await exited.catch(()=>{});}
  restored?.close();store?.close();await rm(dir,{recursive:true,force:true});
 }
});
