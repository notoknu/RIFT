import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Interface,ZeroHash} from 'ethers';
import {loadDropSnapshot} from '../src/drop-snapshot.js';
const abi=JSON.parse(readFileSync(new URL('../public/drop-contract.json',import.meta.url))).abi;
const iface=new Interface(abi),address='0x1111111111111111111111111111111111111111';
const values={name:'Snapshot',totalMinted:1,maxSupply:100,mintPrice:0,walletLimit:2,txLimit:2,storageMode:0,owner:address,paused:false,start:0,end:0,merkleRoot:ZeroHash,allowlistEnd:0};
function setup({reorg=false,failField=false,missing=false}={}){
 const calls=[],paused=[];let active=0,maxActive=0;
 const createRpc=({endpoints:[endpoint]})=>{
  let headers=0;
  return {pause(){paused.push(endpoint)},async request({method,params}){
   calls.push({endpoint,method,params});
   if(method==='eth_blockNumber')return endpoint==='first'?'0x100':'0x200';
   const block=endpoint==='first'?'0x100':'0x200';
   if(method==='eth_getBlockByNumber'){
    assert.deepEqual(params,[block,false]);headers++;
    if(missing&&endpoint==='first')return null;
    return {number:block,hash:'0x'+(reorg&&endpoint==='first'&&headers>1?'b':'a').repeat(64)};
   }
   assert.equal(method,'eth_call');assert.equal(params[1],block);
   active++;maxActive=Math.max(maxActive,active);await new Promise(r=>setImmediate(r));active--;
   const field=iface.getFunction(params[0].data.slice(0,10)).name;
   if(failField&&endpoint==='first'&&field==='name')throw Error('RPC failure');
   return iface.encodeFunctionResult(field,[field==='name'?endpoint:values[field]]);
  }};
 };
 return {createRpc,calls,paused,get maxActive(){return maxActive}};
}
test('all fields share a fixed block with bounded concurrency and matching boundary hashes',async()=>{
 const m=setup();const result=await loadDropSnapshot({address,abi,endpoints:['first'],createRpc:m.createRpc});
 assert.equal(result.values.name,'first');assert.equal(result.values.totalMinted,1n);assert.equal(result.observation.blockNumber,'256');assert.equal(m.calls.filter(c=>c.method==='eth_call').length,13);assert.equal(m.calls.filter(c=>c.method==='eth_getBlockByNumber').length,2);assert.ok(m.maxActive<=4);assert.deepEqual(m.paused,['first']);
});
test('reorg discards the entire first snapshot and re-reads all fields on fallback',async()=>{
 const m=setup({reorg:true});const result=await loadDropSnapshot({address,abi,endpoints:['first','second'],createRpc:m.createRpc});assert.equal(result.values.name,'second');assert.equal(result.observation.blockNumber,'512');for(const endpoint of ['first','second'])assert.equal(m.calls.filter(c=>c.endpoint===endpoint&&c.method==='eth_call').length,13);assert.deepEqual(m.paused,['first','second']);
});
test('missing header cannot produce a collection snapshot',async()=>{
 const m=setup({missing:true});await assert.rejects(loadDropSnapshot({address,abi,endpoints:['first'],createRpc:m.createRpc}),/snapshot.*unavailable/i);assert.equal(m.calls.filter(c=>c.method==='eth_call').length,0);assert.deepEqual(m.paused,['first']);
});
test('partial read failure never publishes a partially combined result',async()=>{
 const m=setup({failField:true});const result=await loadDropSnapshot({address,abi,endpoints:['first','second'],createRpc:m.createRpc});assert.equal(result.values.name,'second');assert.equal(result.observation.provider,'second');assert.deepEqual(m.paused,['first','second']);
});
test('invalid address and unbounded provider configuration fail before RPC',async()=>{
 for(const config of [{address:'bad',abi,endpoints:['first']},{address,abi,endpoints:[]},{address,abi,endpoints:['a','b','c','d']}])await assert.rejects(loadDropSnapshot(config),/Invalid/);
});
test('pre-cancelled snapshots perform no provider work',async()=>{
 const m=setup();const controller=new AbortController();controller.abort();await assert.rejects(loadDropSnapshot({address,abi,endpoints:['first'],createRpc:m.createRpc,signal:controller.signal}),e=>e.name==='AbortError');assert.equal(m.calls.length,0);
});
test('cancellation pauses active transport, stops queued fields and prevents fallback/publication',async()=>{
 const controller=new AbortController(),calls=[],paused=[];
 const createRpc=({endpoints:[endpoint]})=>({pause(){paused.push(endpoint)},async request({method}){calls.push({endpoint,method});controller.abort();return '0x100';}});
 await assert.rejects(loadDropSnapshot({address,abi,endpoints:['first','second'],createRpc,signal:controller.signal}),e=>e.name==='AbortError');assert.ok(calls.every(c=>c.endpoint==='first'));assert.ok(paused.includes('first'));assert.ok(!paused.includes('second'));
});
test('terminal contract errors do not trigger whole-snapshot fallback',async()=>{
 let providers=0;const createRpc=()=>{providers++;return {pause(){},async request(){throw Object.assign(Error('execution reverted'),{terminal:true,code:3});}};};
 await assert.rejects(loadDropSnapshot({address,abi,endpoints:['first','second'],createRpc}),e=>e.code===3);assert.equal(providers,1);
});
test('failed snapshot stops queued fields instead of draining all thirteen reads',async()=>{
 const m=setup({failField:true});await assert.rejects(loadDropSnapshot({address,abi,endpoints:['first'],createRpc:m.createRpc}));
 assert.ok(m.calls.filter(c=>c.method==='eth_call').length<=4);assert.equal(m.calls.filter(c=>c.method==='eth_getBlockByNumber').length,1);
});
