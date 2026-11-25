import test from 'node:test';
import assert from 'node:assert/strict';
import {singleFlightInitializer,validateSigningRequest} from '../src/wallet-session-policy.js';
const wallet='0x'+'a'.repeat(40), other='0x'+'b'.repeat(40);
const typed=chainId=>({domain:chainId===undefined?{}:{chainId},types:{Mail:[]},primaryType:'Mail',message:{}});

test('concurrent initialization shares one SDK and caches success',async()=>{
 let calls=0,resolve;const initialize=singleFlightInitializer(()=>{calls++;return new Promise(r=>resolve=r)});
 const a=initialize(),b=initialize();assert.equal(a,b);await Promise.resolve();assert.equal(calls,1);
 const provider={};resolve(provider);assert.equal(await a,provider);assert.equal(await initialize(),provider);assert.equal(calls,1);
});
test('failed initialization permits a later explicit retry',async()=>{
 let calls=0;const initialize=singleFlightInitializer(()=>{if(++calls===1)throw Error('relay down');return 'provider'});
 await assert.rejects(initialize(),/relay down/);assert.equal(await initialize(),'provider');assert.equal(calls,2);
});
test('personal_sign binds account and hex payload without rewriting signed bytes',()=>{
 const request={method:'personal_sign',params:['0x1234',wallet]};validateSigningRequest(request,[wallet]);assert.equal(request.params[0],'0x1234');
 for(const params of [[],['0x1234',other],[wallet,'0x1234'],['plain text',wallet],['0x1',wallet],['0x12',wallet,'extra']])assert.throws(()=>validateSigningRequest({method:'personal_sign',params},[wallet]),/authorized|hex-encoded/);
});
test('typed data binds requested account and accepts Cronos or explicitly chainless domains',()=>{
 for(const chain of [25,'25','0x19',undefined])for(const encoded of [false,true]){
  const data=typed(chain);validateSigningRequest({method:'eth_signTypedData_v4',params:[wallet,encoded?JSON.stringify(data):data]},[wallet]);
 }
 assert.throws(()=>validateSigningRequest({method:'eth_signTypedData_v4',params:[other,typed(25)]},[wallet]),/authorized/);
 for(const chain of [1,0,'invalid',null])assert.throws(()=>validateSigningRequest({method:'eth_signTypedData_v4',params:[wallet,typed(chain)]},[wallet]),/chain|Cronos/);
});
test('malformed typed data and legacy/raw signing fail closed',()=>{
 for(const data of ['{','null','[]',{}, {domain:{},types:{},primaryType:'Mail'}, {...typed(25),domain:[]}])assert.throws(()=>validateSigningRequest({method:'eth_signTypedData_v4',params:[wallet,data]},[wallet]),/Malformed/);
 for(const method of ['eth_sign','eth_signTypedData','eth_signTypedData_v1','eth_signTypedData_v3'])assert.throws(()=>validateSigningRequest({method,params:[]},[wallet]),/Unsupported/);
});
test('cancelled connection attempt keeps its lock until settlement and rejects late commits',async()=>{
 const {connectionAttemptGate}=await import('../src/wallet-session-policy.js');const gate=connectionAttemptGate();const first=gate.begin();first.check();gate.cancel();assert.equal(first.current(),false);assert.throws(()=>first.check(),/cancelled/);assert.throws(()=>gate.begin(),/still settling/);first.finish();const second=gate.begin();second.check();first.finish();assert.equal(second.current(),true);second.finish();
});
test('a late injected-wallet approval cannot continue into chain changes or state commit',async()=>{
 const {connectionAttemptGate}=await import('../src/wallet-session-policy.js');const gate=connectionAttemptGate();const attempt=gate.begin();let resolve,committed=false;const request=new Promise(r=>resolve=r);const pending=(async()=>{await request;attempt.check();committed=true})();gate.cancel();resolve();await assert.rejects(pending,/cancelled/);assert.equal(committed,false);attempt.finish();
});
