import {Miniflare,convertV4MiniflareOptions} from 'miniflare';import {build} from 'esbuild';import {readFile,readdir,writeFile} from 'node:fs/promises';import {Wallet} from 'ethers';import assert from 'node:assert/strict';
const origin='https://rift.surge.sh',wallet=Wallet.createRandom();let mf;
try{
 const bundle=await build({entryPoints:['edge/worker.js'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
 mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-11-01',d1Databases:['DB'],bindings:{PUBLIC_ORIGIN:origin,CREATOR_AUTH_TRANSPORT:'bearer'}}));await mf.ready;
 const db=await mf.getD1Database('DB');for(const file of(await readdir('edge/migrations')).filter(f=>f.endsWith('.sql')).sort())for(const sql of(await readFile('edge/migrations/'+file,'utf8')).split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 const req=(path,method='GET',data,token,site=origin)=>mf.dispatchFetch('https://worker.example/api/v1'+path,{method,headers:{Origin:site,'Sec-Fetch-Site':'cross-site',...(data?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:data?JSON.stringify(data):undefined});
 let r=await mf.dispatchFetch('https://worker.example/api/v1/auth/verify',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(r.headers.get('Access-Control-Allow-Credentials'),null);
 assert.equal((await req('/auth/session','GET',undefined,undefined,'https://evil.example')).status,403);
 r=await req('/auth/nonce','POST',{address:wallet.address});assert.equal(r.status,200);const nonce=await r.json();
 r=await req('/auth/verify','POST',{nonce:nonce.nonce,signature:await wallet.signMessage(nonce.message)});assert.equal(r.status,200);assert.equal(r.headers.get('set-cookie'),null);const session=await r.json(),token=session.sessionToken;
 assert.equal((await req('/auth/session','GET',undefined,token)).status,200);
 r=await req('/launch-drafts','POST',{mode:2,config:{name:'Isolated D1 fixture'}},token);assert.equal(r.status,201);
 r=await req('/launch-drafts','GET',undefined,token);assert.equal((await r.json()).drafts.length,1);
 assert.equal((await req('/auth/logout','POST',{},token)).status,200);assert.equal((await req('/auth/session','GET',undefined,token)).status,401);
 const report={passed:true,scope:'Local real Worker/D1 emulator; not a deployed Cloudflare account',checks:['Creator preflight exact-origin/no cookie credentials','Reject hostile origin','Wallet-signature bearer sign-in','D1 draft persistence within test database','Logout revocation'],mainnetTransactions:0};await writeFile('checks/split-creator-worker.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await mf?.dispose();}
