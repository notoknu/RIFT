import test from 'node:test';import assert from 'node:assert/strict';import {Wallet} from 'ethers';import {mkdtemp,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';
import express from 'express';import {creatorAPIPlugin} from '../server/creator-api.js';import {snapshot,restore} from '../scripts/database-snapshot.js';
import {localD1} from '../server/local-d1.js';import {createCreatorService} from '../shared/creator-service.js';import {profileDocument} from '../shared/profile-document.js';
const origin='https://rift-q6qs.onrender.com',alice=Wallet.createRandom(),bob=Wallet.createRandom();
function setup(path=':memory:'){
 const db=localD1(path),svc=createCreatorService({db,origin});
 async function req(route,method='GET',body,cookie){const r=await svc.handle(new Request(origin+'/api/v1'+route,{method,headers:{Origin:origin,...(body!==undefined?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)}));return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 async function login(w=alice){const n=await req('/auth/nonce','POST',{address:w.address});return (await req('/auth/verify','POST',{nonce:n.data.nonce,signature:await w.signMessage(n.data.message)})).cookie;}
 return {db,req,login};
}
test('private profiles require wallet session, isolate identities and reject ownership injection',async()=>{
 const f=setup();try{assert.equal((await f.req('/profile')).status,401);const a=await f.login(),b=await f.login(bob);assert.equal((await f.req('/profile','GET',undefined,a)).data.profile,null);
 assert.equal((await f.req('/profile','PUT',{version:0,displayName:'Alice',wallet:bob.address},a)).status,400);
 const saved=await f.req('/profile','PUT',{version:0,displayName:' Alice ',bio:'Creator',website:'https://example.com'},a);assert.equal(saved.status,200);assert.equal(saved.data.version,1);
 const read=await f.req('/profile','GET',undefined,a);assert.equal(read.data.profile.displayName,'Alice');assert.equal(read.data.address,alice.address.toLowerCase());assert.equal((await f.req('/profile','GET',undefined,b)).data.profile,null);
 }finally{f.db.close();}
});
test('profile updates/deletion use atomic versions and do not overwrite concurrent edits',async()=>{
 const f=setup();try{const a=await f.login();const doc={version:0,displayName:'Original'};assert.equal((await f.req('/profile','PUT',doc,a)).status,200);assert.equal((await f.req('/profile','PUT',doc,a)).status,409);
 assert.equal((await f.req('/profile','PUT',{version:1,displayName:'Updated'},a)).data.version,2);assert.equal((await f.req('/profile','PUT',{version:1,displayName:'Lost update'},a)).status,409);
 assert.equal((await f.req('/profile','DELETE',{version:1},a)).status,409);assert.equal((await f.req('/profile','DELETE',{version:2},a)).status,200);assert.equal((await f.req('/profile','GET',undefined,a)).data.profile,null);
 }finally{f.db.close();}
});
test('profile persistence survives closing/reopening SQLite, without claiming hosted durability',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rift-profile-'));let f;try{const path=join(dir,'creator.sqlite');f=setup(path);const a=await f.login();await f.req('/profile','PUT',{version:0,displayName:'Persistent local test'},a);f.db.close();f=null;f=setup(path);assert.equal((await f.req('/profile','GET',undefined,a)).data.profile.displayName,'Persistent local test');}finally{f?.db.close();await rm(dir,{recursive:true,force:true});}
});
test('profile documents reject secrets/extra fields, invalid versions/URLs/IPFS and oversized content',()=>{
 for(const patch of [{apiKey:'secret'},{version:-1},{version:1.5},{displayName:'x'.repeat(49)},{bio:'x'.repeat(501)},{website:'javascript:alert(1)'},{website:'https://user:password@example.com'},{avatar:'https://example.com/a.png'},{displayName:'<script>'},{displayName:'a\nb'}])assert.throws(()=>profileDocument({version:0,...patch}));
 assert.equal(JSON.parse(profileDocument({version:0,displayName:'Name',bio:'line one\nline two'}).document).bio,'line one\nline two');
});
test('production account routes fail closed without persistent storage configuration',async()=>{
 const app=express();creatorAPIPlugin({env:{NODE_ENV:'production',PUBLIC_ORIGIN:origin,CREATOR_DB:'data/ephemeral.sqlite'}}).configureServer({middlewares:app});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/v1/profile',{headers:{Origin:origin}});assert.equal(r.status,503);assert.match((await r.json()).error,/persistent/);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('SQLite snapshot and restore include profile storage in a fresh destination',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rift-profile-backup-'));let f;try{const source=join(dir,'source.sqlite'),backup=join(dir,'backup.sqlite'),target=join(dir,'restored.sqlite');f=setup(source);const cookie=await f.login();await f.req('/profile','PUT',{version:0,displayName:'Backup fixture'},cookie);await snapshot(source,backup);f.db.close();f=null;await restore(backup,target,{stopped:true});f=setup(target);assert.equal((await f.req('/profile','GET',undefined,cookie)).data.profile.displayName,'Backup fixture');}finally{f?.db.close();await rm(dir,{recursive:true,force:true});}
});
