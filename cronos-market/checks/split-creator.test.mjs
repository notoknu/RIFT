import test from 'node:test';import assert from 'node:assert/strict';
import {Wallet} from 'ethers';import express from 'express';
import {localD1} from '../server/local-d1.js';import {createCreatorService} from '../shared/creator-service.js';
import {publicReadCors} from '../deployment/public-cors.mjs';import {createCreatorTransport} from '../src/creator-transport.js';
const origin='https://rift.surge.sh',api='https://rift-api.example',alice=Wallet.createRandom(),bob=Wallet.createRandom();
function fixture(){
 let clock=1700000000000;const db=localD1(':memory:');
 const service=createCreatorService({db,origin,sessionTransport:'bearer',now:()=>clock});
 async function request(path,method='GET',data,token,extra={}){
  const res=await service.handle(new Request(api+'/api/v1'+path,{method,headers:{Origin:origin,'Sec-Fetch-Site':'cross-site',...(data!==undefined?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...extra},body:data===undefined?undefined:JSON.stringify(data)}));
  return {status:res.status,headers:res.headers,data:await res.json()};
 }
 async function login(wallet=alice){const n=await request('/auth/nonce','POST',{address:wallet.address});assert.equal(n.status,200);return request('/auth/verify','POST',{nonce:n.data.nonce,signature:await wallet.signMessage(n.data.message)});}
 return {db,request,login,advance:ms=>clock+=ms};
}
test('split creator: wallet signature issues short-lived hashed bearer session, never cookie',async()=>{
 const f=fixture();try{const r=await f.login();assert.equal(r.status,200);assert.match(r.data.sessionToken,/^[a-f0-9]{64}$/);assert.equal(r.headers.get('set-cookie'),null);assert.equal(r.headers.get('cache-control'),'no-store');
 assert.equal((await f.request('/auth/session','GET',undefined,r.data.sessionToken)).data.address,alice.address.toLowerCase());
 const stored=await f.db.prepare('SELECT hash FROM creator_sessions').bind().first();assert.notEqual(stored.hash,r.data.sessionToken);
 assert.equal((await f.request('/auth/session','GET',undefined,undefined,{Cookie:'__Host-rift_session='+r.data.sessionToken})).status,401);
 for(const bad of ['https://evil.example','null',''])assert.equal((await f.request('/auth/session','GET',undefined,r.data.sessionToken,{Origin:bad})).status,403);
 f.advance(3600001);assert.equal((await f.request('/auth/session','GET',undefined,r.data.sessionToken)).status,401);
 }finally{f.db.close();}
});
test('split creator: draft isolation and logout revocation survive cross-site transport',async()=>{
 const f=fixture();try{const a=(await f.login()).data.sessionToken,b=(await f.login(bob)).data.sessionToken;
 const made=await f.request('/launch-drafts','POST',{mode:2,config:{name:'Isolated test draft'}},a);assert.equal(made.status,201);
 assert.equal((await f.request('/launch-drafts/'+made.data.id,'GET',undefined,b)).status,404);
 assert.equal((await f.request('/auth/logout','POST',{},a)).status,200);assert.equal((await f.request('/auth/session','GET',undefined,a)).status,401);
 }finally{f.db.close();}
});
test('split creator: nonce replay and wrong signatures remain rejected',async()=>{
 const f=fixture();try{const n=await f.request('/auth/nonce','POST',{address:alice.address});const data={nonce:n.data.nonce,signature:await alice.signMessage(n.data.message)};
 assert.equal((await f.request('/auth/verify','POST',data)).status,200);assert.equal((await f.request('/auth/verify','POST',data)).status,401);
 const bad=await f.request('/auth/nonce','POST',{address:alice.address});assert.equal((await f.request('/auth/verify','POST',{nonce:bad.data.nonce,signature:await bob.signMessage(bad.data.message)})).status,401);
 }finally{f.db.close();}
});
test('CORS opt-in opens only exact creator routes/methods/headers, never credential cookies',async()=>{
 const app=express();app.use(publicReadCors(origin,{creatorBearer:true}));app.use((req,res)=>res.json({ok:true}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url='http://127.0.0.1:'+server.address().port;
 try{
  const pre=async(path,method='POST',headers='authorization,content-type',site=origin)=>fetch(url+path,{method:'OPTIONS',headers:{Origin:site,'Access-Control-Request-Method':method,'Access-Control-Request-Headers':headers}});
  let r=await pre('/api/v1/auth/verify');assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),origin);assert.equal(r.headers.get('access-control-allow-credentials'),null);
  assert.equal((await pre('/api/v1/auth/verify','DELETE')).status,405);
  assert.equal((await pre('/api/v1/auth/verify','POST','x-admin')).status,403);
  assert.equal((await pre('/api/unrelated-write')).status,403);
  r=await pre('/api/v1/auth/verify','POST','authorization','https://evil.example');assert.equal(r.headers.get('access-control-allow-origin'),null);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('browser transport keeps token private/in memory, drops it on expiry and reset',async()=>{
 const calls=[];let clock=1700000000000;const token='a'.repeat(64);
 const transport=createCreatorTransport({origin:api,now:()=>clock,fetcher:async(url,opts)=>{calls.push({url,opts});return new Response(JSON.stringify(url.endsWith('/auth/verify')?{address:alice.address,sessionToken:token,expiresAt:new Date(clock+3600000).toISOString()}:{ok:true}));}});
 const out=await transport.request('/auth/verify',{method:'POST',body:{}});assert.equal(out.sessionToken,undefined);
 await transport.request('/launch-drafts');assert.equal(calls.at(-1).opts.headers.Authorization,'Bearer '+token);assert.equal(calls.at(-1).opts.credentials,'omit');assert.equal(calls.at(-1).opts.redirect,'error');
 clock+=3600001;await transport.request('/launch-drafts');assert.equal(calls.at(-1).opts.headers.Authorization,undefined);
 await transport.request('/auth/verify',{method:'POST',body:{}});transport.clear();await transport.request('/launch-drafts');assert.equal(calls.at(-1).opts.headers.Authorization,undefined);
 for(const path of ['//evil.example/x','/../auth','/auth/session#bad'])await assert.rejects(transport.request(path),/Invalid creator route/);
});
test('cancelled/late sign-in cannot restore a cleared session',async()=>{
 let finish;const t=createCreatorTransport({origin:api,fetcher:()=>new Promise(resolve=>finish=resolve)});const old=t.currentEpoch();t.clear();await assert.rejects(t.request('/auth/verify',{sessionEpoch:old}),/cancelled/);
 const pending=t.request('/auth/verify',{method:'POST'});t.clear();finish(new Response(JSON.stringify({sessionToken:'a'.repeat(64),expiresAt:new Date(Date.now()+3600000).toISOString()})));await assert.rejects(pending,/cancelled/);
});
