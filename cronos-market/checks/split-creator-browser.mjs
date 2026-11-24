// Real local HTTPS servers on different sites; no production funds or accounts.
import https from 'node:https';import express from 'express';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';import {chromium} from '@playwright/test';import {Wallet} from 'ethers';
import {localD1} from '../server/local-d1.js';import {createCreatorService} from '../shared/creator-service.js';import {publicReadCors} from '../deployment/public-cors.mjs';import {apiSecurity} from '../server/security.js';
const tmp=await mkdtemp(join(tmpdir(),'rift-split-https-'));let front,back,browser,db;
const listen=s=>new Promise(r=>s.listen(0,'127.0.0.1',r));
try{
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(tmp,'key.pem'),'-out',join(tmp,'cert.pem'),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 const tls={key:await readFile(join(tmp,'key.pem')),cert:await readFile(join(tmp,'cert.pem'))};
 const bundle=await build({entryPoints:['src/creator-transport.js'],bundle:true,write:false,format:'iife',globalName:'RiftTransport',define:{'import.meta.env':'{}'},logLevel:'silent'});
 front=https.createServer(tls,(req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Isolated split-host test</title><h1>Local test only</h1><script>'+bundle.outputFiles[0].text+'</script>');});await listen(front);
 const origin='https://localhost:'+front.address().port;
 db=localD1(':memory:');const service=createCreatorService({db,origin,sessionTransport:'bearer'}),app=express();
 app.use(publicReadCors(origin,{creatorBearer:true}));apiSecurity(app,{generalLimit:1000});app.use(express.raw({type:()=>true,limit:'64kb'}));
 const seen=[];app.use(async(req,res)=>{seen.push({method:req.method,path:req.path,origin:req.headers.origin,site:req.headers['sec-fetch-site']});const r=await service.handle(new Request('https://127.0.0.1'+req.originalUrl,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:req.body}));if(!r)return res.status(404).end();res.status(r.status);r.headers.forEach((v,k)=>res.setHeader(k,v));res.end(Buffer.from(await r.arrayBuffer()));});
 back=https.createServer(tls,app);await listen(back);const api='https://127.0.0.1:'+back.address().port;
 browser=await chromium.launch({args:['--no-sandbox']});const page=await browser.newPage({ignoreHTTPSErrors:true});await page.goto(origin);
 await page.evaluate(api=>globalThis.client=RiftTransport.createCreatorTransport({origin:api}),api);
 const wallet=Wallet.createRandom();const nonce=await page.evaluate(address=>client.request('/auth/nonce',{method:'POST',body:{address}}),wallet.address);
 const signature=await wallet.signMessage(nonce.message);const login=await page.evaluate(data=>client.request('/auth/verify',{method:'POST',body:data}),{nonce:nonce.nonce,signature});
 if(login.sessionToken!==undefined)throw Error('Token leaked to UI response');
 const draft=await page.evaluate(()=>client.request('/launch-drafts',{method:'POST',body:{mode:2,config:{name:'Isolated browser fixture'}}}));
 const list=await page.evaluate(()=>client.request('/launch-drafts'));if(list.drafts[0]?.id!==draft.id)throw Error('Draft save/list mismatch');
 await page.evaluate(()=>client.request('/auth/logout',{method:'POST',body:{}}));
 const rejected=await page.evaluate(async()=>{try{await client.request('/auth/session');return false}catch{return true}});if(!rejected)throw Error('Logout failed');
 // A reload creates a new transport with no session, even if old bearer still exists server-side.
 await page.reload();await page.evaluate(api=>globalThis.client=RiftTransport.createCreatorTransport({origin:api}),api);
 const noRestore=await page.evaluate(async()=>{try{await client.request('/auth/session');return false}catch{return true}});if(!noRestore)throw Error('Unexpected persisted session');
 if(!seen.some(r=>r.site==='cross-site'&&r.path==='/api/v1/launch-drafts'&&r.method==='POST'))throw Error('Did not exercise actual cross-site browser writes');
 const report={passed:true,scope:'Isolated real local HTTPS cross-site CORS+creator service+SQLite+Chromium, not deployed backend acceptance',checks:['Wallet-message challenge and verification','No session token returned to UI','Draft write/read','Actual browser cross-site Origin and Sec-Fetch-Site','Logout revocation','No session restoration after reload'],mainnetTransactions:0};await writeFile('checks/split-creator-browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{
 await browser?.close();for(const s of [front,back])if(s){s.closeAllConnections();await new Promise(r=>s.close(r));}db?.close();await rm(tmp,{recursive:true,force:true});
}
