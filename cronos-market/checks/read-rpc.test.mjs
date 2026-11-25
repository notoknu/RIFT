import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadRpc} from '../src/read-rpc.js';
const endpoints=['https://first.example','https://second.example'];
const response=(id,result)=>Response.json({jsonrpc:'2.0',id,result});
function mock(fn){const calls=[];return {calls,fetcher:async(url,options)=>{const body=JSON.parse(options.body);calls.push({url,body,options});return fn(url,body,options)}};}
test('probes Cronos before reads, shares probe and blocks every write/signing method',async()=>{
 const m=mock((u,b)=>response(b.id,b.method==='eth_chainId'?'0x19':'0x12'));const rpc=createReadRpc({...m,endpoints});
 assert.deepEqual(await Promise.all([rpc.request({method:'eth_blockNumber'}),rpc.request({method:'eth_getCode',params:['0x123','latest']})]),['0x12','0x12']);
 assert.equal(m.calls.filter(c=>c.body.method==='eth_chainId').length,1);
 const before=m.calls.length;for(const method of ['eth_sendTransaction','eth_sendRawTransaction','personal_sign','wallet_switchEthereumChain','eth_signTypedData_v4','unknown'])await assert.rejects(rpc.request({method}),/allowlisted/);assert.equal(m.calls.length,before);
 assert.equal(m.calls[0].options.credentials,'omit');assert.equal(m.calls[0].options.redirect,'error');
});
test('wrong-chain endpoint is quarantined and never receives data reads',async()=>{
 const m=mock((u,b)=>response(b.id,u.includes('first')?'0x1':b.method==='eth_chainId'?'0x19':'0x99'));const rpc=createReadRpc({...m,endpoints});
 assert.equal(await rpc.request({method:'eth_blockNumber'}),'0x99');rpc.reset();assert.equal(await rpc.request({method:'eth_blockNumber'}),'0x99');
 assert.equal(m.calls.filter(c=>c.url.includes('first')).length,1);
});
test('HTTP rate limits fall back once and cool down the failed provider',async()=>{
 let time=1;const m=mock((u,b)=>u.includes('first')?new Response('',{status:429}):response(b.id,b.method==='eth_chainId'?'0x19':'0x5'));const rpc=createReadRpc({...m,endpoints,now:()=>time,random:()=>0});
 await rpc.request({method:'eth_blockNumber'});await rpc.request({method:'eth_blockNumber'});assert.equal(m.calls.filter(c=>c.url.includes('first')).length,1);
 time+=5001;await rpc.request({method:'eth_blockNumber'});assert.equal(m.calls.filter(c=>c.url.includes('first')).length,2);
});
test('execution reverts fail without trying another provider',async()=>{
 const m=mock((u,b)=>b.method==='eth_chainId'?response(b.id,'0x19'):Response.json({jsonrpc:'2.0',id:b.id,error:{code:3,message:'execution reverted',data:'0x1234'}}));
 await assert.rejects(createReadRpc({...m,endpoints}).request({method:'eth_call',params:[{},'latest']}),e=>e.code===3&&e.data==='0x1234');assert.ok(m.calls.every(c=>c.url.includes('first')));
});
test('malformed, oversized and mismatched responses never escape as results',async()=>{
 for(const make of [b=>Response.json({jsonrpc:'2.0',id:b.id+1,result:'0x19'}),b=>new Response('x'.repeat(300)),b=>Response.json({jsonrpc:'2.0',id:b.id,result:'0x19',error:{code:3}})]){
  const m=mock((u,b)=>make(b));await assert.rejects(createReadRpc({...m,endpoints:[endpoints[0]],maxBytes:128}).request({method:'eth_blockNumber'}),/unavailable/);
 }
});
test('pause invalidates in-flight reads and prevents fallback; resume is explicit',async()=>{
 let release;const m=mock((u,b)=>b.method==='eth_chainId'?response(b.id,'0x19'):new Promise(r=>release=()=>r(response(b.id,'0x7'))));const rpc=createReadRpc({...m,endpoints});const pending=rpc.request({method:'eth_blockNumber'});
 while(!release)await new Promise(r=>setImmediate(r));rpc.pause();release();await assert.rejects(pending,/invalidated/);await assert.rejects(rpc.request({method:'eth_blockNumber'}),/paused/);assert.ok(m.calls.every(c=>c.url.includes('first')));rpc.resume();assert.equal(await rpc.request({method:'eth_chainId'}),'0x19');
});
test('bounded fetch timeout falls back without transaction replay',async()=>{
 const m=mock((u,b,o)=>u.includes('first')?new Promise((_,reject)=>o.signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true})):response(b.id,b.method==='eth_chainId'?'0x19':'0x8'));
 assert.equal(await createReadRpc({...m,endpoints,timeoutMs:10}).request({method:'eth_blockNumber'}),'0x8');assert.equal(m.calls.filter(c=>c.url.includes('first')).length,1);
});
test('limits and unsafe endpoint forms are rejected',()=>{
 for(const value of ['http://example.com','https://user:secret@example.com','https://example.com?key=secret','https://example.com/#fragment'])assert.throws(()=>createReadRpc({endpoints:[value]}));
 for(const options of [{endpoints:[]},{timeoutMs:0},{maxBytes:1}])assert.throws(()=>createReadRpc(options),/limits/);
});
test('Retry-After seconds and dates are respected but capped without sleeping',async()=>{
 for(const [header,expected] of [['90',90000],['999999',120000],[new Date(60000).toUTCString(),60000],['invalid',5000],['0',5000]]){
  const m=mock(()=>new Response('',{status:429,headers:{'Retry-After':header}}));
  const rpc=createReadRpc({...m,endpoints:[endpoints[0]],now:()=>0,random:()=>0});
  await assert.rejects(rpc.request({method:'eth_blockNumber'}),/unavailable/);
  assert.equal(rpc.diagnostics().providers[0].retryInMs,expected);assert.equal(rpc.diagnostics().providers[0].lastFailure,'rate-limited');
 }
});
test('backoff grows with bounded jitter and resets only after successful read',async()=>{
 let time=0,fail=true;
 const m=mock((u,b)=>fail?new Response('',{status:503}):response(b.id,b.method==='eth_chainId'?'0x19':'0x8'));
 const rpc=createReadRpc({...m,endpoints:[endpoints[0]],now:()=>time,random:()=>1});
 for(const expected of [6000,12000,24000,48000,72000,72000]){
  await assert.rejects(rpc.request({method:'eth_blockNumber'}));assert.equal(rpc.diagnostics().providers[0].retryInMs,expected);time+=expected;
 }
 fail=false;assert.equal(await rpc.request({method:'eth_blockNumber'}),'0x8');assert.equal(rpc.diagnostics().providers[0].consecutiveFailures,0);assert.equal(rpc.diagnostics().providers[0].lastFailure,null);
});
test('pause actively aborts transport without fallback',async()=>{
 let entered;const started=new Promise(resolve=>entered=resolve);let aborted=false;
 const m=mock((u,b,o)=>{entered();return new Promise((resolve,reject)=>o.signal.addEventListener('abort',()=>{aborted=true;reject(Error('abort'));},{once:true}));});
 const rpc=createReadRpc({...m,endpoints});const pending=rpc.request({method:'eth_blockNumber'});await started;rpc.pause();
 await assert.rejects(pending,/invalidated/);assert.equal(aborted,true);assert.equal(m.calls.length,1);assert.equal(rpc.diagnostics().paused,true);
});
test('reset discards stale probes even if an injected transport ignores abort',async()=>{
 const releases=[];const m=mock((u,b)=>b.method==='eth_chainId'?new Promise(resolve=>releases.push(chain=>resolve(response(b.id,chain)))):response(b.id,'0x9'));
 const rpc=createReadRpc({...m,endpoints:[endpoints[0]]});const old=rpc.request({method:'eth_blockNumber'});const rejected=assert.rejects(old,/invalidated/);
 rpc.reset();const fresh=rpc.request({method:'eth_blockNumber'});assert.equal(releases.length,2);
 releases[0]('0x1');await rejected;assert.notEqual(rpc.diagnostics().providers[0].status,'quarantined');
 releases[1]('0x19');assert.equal(await fresh,'0x9');assert.equal(rpc.diagnostics().providers[0].status,'verified');
});
test('diagnostics disclose no URL paths, request params or error bodies and are detached',async()=>{
 const m=mock(()=>new Response('secret-error-marker',{status:429}));const rpc=createReadRpc({...m,endpoints:['https://first.example/private-marker'],random:()=>0});
 await assert.rejects(rpc.request({method:'eth_getBalance',params:['private-address-marker','latest']}));
 const status=rpc.diagnostics();assert.doesNotMatch(JSON.stringify(status),/private|https|secret/);status.providers[0].status='verified';assert.equal(rpc.diagnostics().providers[0].status,'cooling-down');
});
test('reset clears cooldown but never removes wrong-chain quarantine or resumes pause',async()=>{
 const m=mock((u,b)=>response(b.id,'0x1'));const rpc=createReadRpc({...m,endpoints:[endpoints[0]]});
 await assert.rejects(rpc.request({method:'eth_blockNumber'}));rpc.pause();rpc.reset();assert.equal(rpc.diagnostics().paused,true);assert.equal(rpc.diagnostics().providers[0].status,'quarantined');rpc.resume();await assert.rejects(rpc.request({method:'eth_blockNumber'}));assert.equal(m.calls.length,1);
});
test('revert errors never add a provider cooldown or retry on another endpoint',async()=>{
 const m=mock((u,b)=>b.method==='eth_chainId'?response(b.id,'0x19'):Response.json({jsonrpc:'2.0',id:b.id,error:{code:3,message:'execution reverted'}}));const rpc=createReadRpc({...m,endpoints});
 await assert.rejects(rpc.request({method:'eth_call'}));assert.equal(rpc.diagnostics().providers[0].retryInMs,0);assert.equal(rpc.diagnostics().providers[0].consecutiveFailures,0);assert.equal(m.calls.length,2);
});
