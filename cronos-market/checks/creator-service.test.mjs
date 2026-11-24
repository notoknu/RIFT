import test from 'node:test';import assert from 'node:assert/strict';
import {Wallet} from 'ethers';import {localD1} from '../server/local-d1.js';import {createCreatorService} from '../shared/creator-service.js';
const origin='https://rift.example',cid='bafybeigdyrzt5sfp7udm7hu76uh7y26nf3pteuja4j4wzrflz7me3lxb4i';
const alice=Wallet.createRandom(),bob=Wallet.createRandom();
function setup(extra={}){
 const db=localD1(':memory:');const service=createCreatorService({db,origin,...extra});
 async function req(path,method='GET',data,cookie,headers={}){
  const result=await service.handle(new Request(origin+'/api/v1'+path,{method,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(data!==undefined&&!(data instanceof FormData)?{'Content-Type':'application/json'}:{}),...headers},body:data===undefined?undefined:data instanceof FormData?data:JSON.stringify(data)}));
  return {status:result.status,data:await result.json(),cookie:result.headers.get('set-cookie')?.split(';')[0],headers:result.headers};
 }
 async function login(wallet=alice){const nonce=await req('/auth/nonce','POST',{address:wallet.address});assert.equal(nonce.status,200);const result=await req('/auth/verify','POST',{nonce:nonce.data.nonce,signature:await wallet.signMessage(nonce.data.message)});assert.equal(result.status,200);return result.cookie}
 return {db,req,login};
}
test('SIWE-style sessions bind origin/chain, consume nonce once and revoke on logout',async()=>{
 const {db,req,login}=setup();try{
  const blocked=await req('/auth/nonce','POST',{address:alice.address},null,{Origin:'https://evil.example'});assert.equal(blocked.status,403);
  const nonce=await req('/auth/nonce','POST',{address:alice.address});assert.match(nonce.data.message,/Chain ID: 25/);assert.match(nonce.data.message,/URI: https:\/\/rift.example/);
  const signature=await alice.signMessage(nonce.data.message),result=await req('/auth/verify','POST',{nonce:nonce.data.nonce,signature});assert.equal(result.status,200);assert.match(result.headers.get('set-cookie'),/Secure/);assert.match(result.headers.get('set-cookie'),/HttpOnly/);assert.match(result.headers.get('set-cookie'),/SameSite=Strict/);
  assert.equal((await req('/auth/verify','POST',{nonce:nonce.data.nonce,signature})).status,401);
  assert.equal((await req('/auth/session','GET',undefined,result.cookie)).data.address,alice.address.toLowerCase());
  assert.equal((await req('/auth/logout','POST',{},result.cookie)).status,200);assert.equal((await req('/auth/session','GET',undefined,result.cookie)).status,401);
  const invalid=await req('/auth/nonce','POST',{address:alice.address});assert.equal((await req('/auth/verify','POST',{nonce:invalid.data.nonce,signature:await bob.signMessage(invalid.data.message)})).status,401);
 }finally{db.close()}
});
test('drafts persist, isolate owners, enforce optimistic versions and reject secrets',async()=>{
 const {db,req,login}=setup();try{
  const a=await login(alice),b=await login(bob),doc={mode:2,config:{name:'Original collection'}};
  assert.equal((await req('/launch-drafts','POST',doc)).status,401);
  const result=await req('/launch-drafts','POST',doc,a);assert.equal(result.status,201);const path='/launch-drafts/'+result.data.id;
  assert.equal((await req(path,'GET',undefined,b)).status,404);
  assert.equal((await req(path,'PATCH',{version:1,document:doc},a)).data.version,2);
  assert.equal((await req(path,'PATCH',{version:1,document:doc},a)).status,409);
  assert.equal((await req('/launch-drafts','GET',undefined,a)).data.drafts.length,1);
  assert.equal((await req('/launch-drafts','POST',{...doc,config:{apiKey:'no'}},a)).status,400);
  await req('/favorites','PUT',{addresses:[bob.address,bob.address]},a);await req('/favorites/'+bob.address,'PUT',{},a);assert.deepEqual((await req('/favorites','GET',undefined,a)).data.addresses,[bob.address.toLowerCase()]);assert.equal((await req('/favorites','GET',undefined,b)).data.addresses.length,0);
 }finally{db.close()}
});
test('EIP-1271 verifier is used for contract-style signatures; expiry fails closed',async()=>{
 let time=Date.now(),called=false;const {db,req}=setup({now:()=>time,chain:{verify1271:async(wallet,hash,sig)=>{called=true;return sig==='0x1122'}}});try{
  const nonce=await req('/auth/nonce','POST',{address:alice.address});const verified=await req('/auth/verify','POST',{nonce:nonce.data.nonce,signature:'0x1122'});assert.equal(verified.status,200);assert.equal(called,true);
  const expired=await req('/auth/nonce','POST',{address:bob.address});time+=300001;assert.equal((await req('/auth/verify','POST',{nonce:expired.data.nonce,signature:'0x1122'})).status,401);
  time+=86400000;assert.equal((await req('/auth/session','GET',undefined,verified.cookie)).status,401);
 }finally{db.close()}
});
test('sponsored upload allocations are single use, quota capped and credentials never returned',async()=>{
 let calls=0;const {db,req,login}=setup({uploadBytes:200000,uploadFiles:2,uploadProvider:async files=>{calls++;assert.equal(files.length,1);return {cid,size:1000}}});try{
  const cookie=await login(),raw=new Uint8Array([137,80,78,71,13,10,26,10]),allocation=await req('/uploads','POST',{bytes:raw.length,files:1},cookie);assert.equal(allocation.status,201);
  const file=new FormData();file.append('file',new Blob([raw],{type:'image/png'}),'1.png');
  const path='/uploads/'+allocation.data.id+'/files';const first=await req(path,'PUT',file,cookie);assert.equal(first.status,200);assert.equal(first.data.directory,'ipfs://'+cid+'/');
  assert.equal((await req(path,'PUT',file,cookie)).status,409);assert.equal(calls,1);
  assert.equal((await req('/uploads','POST',{bytes:raw.length,files:2},cookie)).status,409);
  const capabilities=await req('/storage/capabilities');assert.equal(capabilities.data.reservedFiles,1);assert.ok(!JSON.stringify(capabilities).includes('Authorization'));
 }finally{db.close()}
});
test('uncertain provider results cannot be retried and owner cannot be spoofed',async()=>{
 const {db,req,login}=setup({uploadBytes:200000,uploadFiles:2,uploadProvider:async()=>{throw Error('provider accepted but response lost')}});try{
  const a=await login(),b=await login(bob),alloc=await req('/uploads','POST',{bytes:8,files:1},a),path='/uploads/'+alloc.data.id;
  assert.equal((await req(path,'GET',undefined,b)).status,404);
  const form=new FormData();form.append('file',new Blob([new Uint8Array([137,80,78,71,13,10,26,10])]),'1.png');
  assert.equal((await req(path+'/files','PUT',form,a)).status,502);assert.equal((await req(path+'/files','PUT',form,a)).status,409);assert.equal((await req(path,'GET',undefined,a)).data.state,'uncertain');
 }finally{db.close()}
});
test('receipt-backed registry controls creator presentation, not client submitted identities',async()=>{
 const chain={register:async(tx,wallet)=>({address:bob.address.toLowerCase(),factory:alice.address.toLowerCase(),block:100,name:'Original',contractURI:'ipfs://'+cid+'/contract.json',image:'ipfs://'+cid+'/pfp.png'})};const {db,req,login}=setup({chain});try{
  const a=await login(),b=await login(bob),registration=await req('/launches/register','POST',{transactionHash:'0x'+'1'.repeat(64),creator:bob.address},a);assert.equal(registration.status,201);
  const path='/collections/'+bob.address+'/presentation',settings={title:'Original creator display',description:'Original',image:'ipfs://'+cid+'/pfp.png',banner:'ipfs://'+cid+'/banner.png'};
  assert.equal((await req(path,'PATCH',settings,b)).status,403);assert.equal((await req(path,'PATCH',settings,a)).status,200);
  assert.equal((await req('/collections/'+bob.address)).data.display_title,settings.title);assert.equal((await req('/launches')).data.collections.length,1);
 }finally{db.close()}
});

test('concurrent allocations cannot oversubscribe a shared file budget',async()=>{
 const {db,req,login}=setup({uploadBytes:500000,uploadFiles:1,uploadProvider:async()=>({cid,size:1})});try{const cookie=await login(),results=await Promise.all(Array.from({length:8},()=>req('/uploads','POST',{bytes:8,files:1},cookie)));assert.equal(results.filter(r=>r.status===201).length,1);assert.equal((await req('/storage/capabilities')).data.reservedFiles,1)}finally{db.close()}
});
test('oversized provider accounting pauses sponsorship; browser receives no provider details',async()=>{
 const {db,req,login}=setup({uploadBytes:500000,uploadFiles:4,uploadProvider:async()=>({cid,size:999999999})});try{const cookie=await login(),allocation=await req('/uploads','POST',{bytes:8,files:1},cookie),form=new FormData();form.append('file',new Blob([new Uint8Array([137,80,78,71,13,10,26,10])]),'1.png');assert.equal((await req('/uploads/'+allocation.data.id+'/files','PUT',form,cookie)).status,502);assert.equal((await req('/storage/capabilities')).data.uploadsEnabled,false);assert.equal((await req('/uploads','POST',{bytes:8,files:1},cookie)).status,409)}finally{db.close()}
});
test('invalid filenames and JSON media references never reach the pin provider',async()=>{
 let called=false;const {db,req,login}=setup({uploadBytes:500000,uploadFiles:4,uploadProvider:async()=>{called=true;return {cid,size:8}}});try{const cookie=await login(),alloc=await req('/uploads','POST',{bytes:100,files:1},cookie),form=new FormData();form.append('file',new Blob(['<svg/>']),'art.svg');assert.equal((await req('/uploads/'+alloc.data.id+'/files','PUT',form,cookie)).status,400);assert.equal(called,false);const meta=new FormData();meta.append('file',new Blob([JSON.stringify({name:'Invalid metadata',image:'https://example.com/art.png'})]),'1.json');assert.equal((await req('/uploads/'+alloc.data.id+'/files','PUT',meta,cookie)).status,400);assert.equal(called,false)}finally{db.close()}
});

test('Pinata adapter sends a public wrapped folder with server-only authorization',async()=>{
 const {pinataProvider}=await import('../shared/pinata-provider.js');let calls=0;
 const provider=pinataProvider('test-only-not-a-real-credential',{fetcher:async(url,options)=>{calls++;assert.equal(url,'https://api.pinata.cloud/pinning/pinFileToIPFS');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer test-only-not-a-real-credential');assert.deepEqual(JSON.parse(options.body.get('pinataOptions')),{cidVersion:1,wrapWithDirectory:true});assert.equal(JSON.parse(options.body.get('pinataMetadata')).name,'RIFT-test-allocation');assert.equal(options.body.getAll('file').length,1);return Response.json({IpfsHash:cid,PinSize:100})}});
 const result=await provider([new File(['{}'],'contract.json',{type:'application/json'})],{allocationId:'test-allocation'});assert.deepEqual(result,{cid,size:100});assert.equal(calls,1);assert.equal(pinataProvider(''),undefined);
});
