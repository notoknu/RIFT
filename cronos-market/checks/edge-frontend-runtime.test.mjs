import {hostedSmoke} from '../scripts/hosted-smoke.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,readdir,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';import {build} from 'esbuild';import {Wallet} from 'ethers';
test('real workerd serves SPA assets and D1 signed sessions on one origin',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rift-edge-assets-'));let mf;
 try{
  await writeFile(join(dir,'index.html'),'<!doctype html><title>RIFT runtime fixture</title><script src="/assets/client.js"></script><main>Same origin shell</main>');await writeFile(join(dir,'client.js'),'console.log("fixture")');
  const bundle=await build({entryPoints:['edge/worker.js'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
  mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-11-01',d1Databases:['DB'],bindings:{PUBLIC_ORIGIN:'https://rift.example'},assets:{directory:dir,binding:'ASSETS',run_worker_first:true,routerConfig:{has_user_worker:true},assetConfig:{not_found_handling:'single-page-application'}}}));
  const db=await mf.getD1Database('DB');for(const file of (await readdir('edge/migrations')).filter(f=>f.endsWith('.sql')).sort()){const sql=await readFile('edge/migrations/'+file,'utf8');for(const s of sql.split(';').map(v=>v.trim()).filter(Boolean))await db.prepare(s).run()}
  for(const path of ['/','/collection/0x123']){const r=await mf.dispatchFetch('https://rift.example'+path,{headers:{Accept:'text/html'}});assert.equal(r.status,200);assert.match(await r.text(),/Same origin shell/);assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/)}
  const js=await mf.dispatchFetch('https://rift.example/client.js');assert.match(await js.text(),/fixture/);
  const unknown=await mf.dispatchFetch('https://rift.example/api/not-an-endpoint');assert.equal(unknown.status,404);assert.match(unknown.headers.get('content-type'),/json/);
  const smoke=await hostedSmoke('https://rift.example',{fetcher:(url,init)=>mf.dispatchFetch(url,init)});assert.equal(smoke.passed,true,JSON.stringify(smoke));
  const wallet=Wallet.createRandom();const send=(path,method='GET',data,cookie,origin='https://rift.example')=>mf.dispatchFetch('https://rift.example/api/v1'+path,{method,headers:{Origin:origin,...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});
  const challenge=await(await send('/auth/nonce','POST',{address:wallet.address})).json();const signed=await send('/auth/verify','POST',{nonce:challenge.nonce,signature:await wallet.signMessage(challenge.message)});assert.equal(signed.status,200);const raw=signed.headers.get('set-cookie');assert.match(raw,/HttpOnly/);assert.match(raw,/SameSite=Strict/);assert.match(raw,/Secure/);const cookie=raw.split(';')[0];
  assert.equal((await send('/launch-drafts','POST',{mode:0,config:{name:'Runtime sign-in fixture'}},cookie)).status,201);
  assert.equal((await send('/favorites','PUT',{addresses:[]},cookie,'https://evil.example')).status,403);
  assert.equal((await send('/auth/logout','POST',{},cookie)).status,200);assert.equal((await send('/launch-drafts','GET',undefined,cookie)).status,401);
 }finally{await mf?.dispose();await rm(dir,{recursive:true,force:true})}
});
