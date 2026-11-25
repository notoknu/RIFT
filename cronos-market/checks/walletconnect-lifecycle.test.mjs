import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';import {createWalletConnect} from '../src/walletconnect.js';
const wallet='0x'+'a'.repeat(40),session={namespaces:{eip155:{accounts:['eip155:25:'+wallet]}}},options={projectId:'a'.repeat(32),origin:'https://rift.example'},tick=()=>new Promise(r=>setImmediate(r));
function universal(){const u=new EventEmitter();u.disconnect=async()=>{u.session=undefined;u.emit('disconnect')};u.request=async()=>null;u.abortPairingAttempt=()=>{};return u}
test('cancelled pairing is quarantined until late approval has been disconnected',async()=>{const u=universal();let resolve,requests=0,connects=0,disconnections=0;u.connect=()=>{connects++;return new Promise(r=>{resolve=r})};u.request=async()=>{requests++;return 'unexpected'};u.disconnect=async()=>{disconnections++;u.session=undefined};let uri='';const p=await createWalletConnect({...options,init:async()=>u,onURI:v=>uri=v}),pending=p.connect();await tick();p.cancel();await assert.rejects(pending,/cancelled/);await assert.rejects(p.connect(),/still settling/);u.emit('display_uri','wc:late@2');assert.equal(uri,'');u.session=session;assert.deepEqual(await p.request({method:'eth_accounts'}),[]);await assert.rejects(p.request({method:'personal_sign',params:[]}),/cancelled/);resolve(session);await tick();assert.equal(disconnections,1);assert.equal(requests,0);u.connect=async()=>{connects++;u.session=session;return session};await p.connect();assert.equal(connects,2);assert.deepEqual(await p.request({method:'eth_accounts'}),[wallet])});
test('sync pairing errors reset in-flight state and permit a later explicit attempt',async()=>{const u=universal();u.connect=()=>{throw Error('sync rejected')};const p=await createWalletConnect({...options,init:async()=>u});await assert.rejects(p.connect(),/sync rejected/);await tick();u.connect=async()=>{u.session=session;return session};await p.connect();assert.deepEqual(await p.request({method:'eth_accounts'}),[wallet])});
test('origins and restored account strings are strictly scoped',async()=>{for(const origin of ['https://user:pass@rift.example','https://rift.example/path','https://rift.example?x=1','http://public.example','https://rift.example/#x'])await assert.rejects(createWalletConnect({...options,origin,init:async()=>universal()}),/origin/);const u=universal();u.session={namespaces:{eip155:{accounts:['eip155:25:bad','eip155:1:'+wallet,'eip155:25:'+wallet+':junk',null]}}};const p=await createWalletConnect({...options,init:async()=>u});assert.deepEqual(await p.request({method:'eth_accounts'}),[]);await assert.rejects(p.connect(),/no authorized Cronos/)});
test('remote session deletion blocks stale SDK session signing until explicit reconnect',async()=>{const u=universal();u.session=session;let requests=0;u.request=async()=>{requests++;return 'unexpected'};const p=await createWalletConnect({...options,init:async()=>u});assert.deepEqual(await p.request({method:'eth_accounts'}),[wallet]);u.emit('session_delete');assert.deepEqual(await p.request({method:'eth_accounts'}),[]);await assert.rejects(p.request({method:'personal_sign',params:[]}),/disconnected/);await assert.rejects(p.request({method:'eth_requestAccounts'}),/stale session/);assert.equal(requests,0);await p.disconnect();u.connect=async()=>{u.session=session;return session};await p.connect();assert.deepEqual(await p.request({method:'eth_accounts'}),[wallet])});
test('expired and malformed-expiry restored sessions cannot be reused for wallet requests',async()=>{for(const expiry of [1,0,Math.floor(Date.now()/1000)-1,'9999999999',null,Infinity]){const u=universal();u.session={...session,expiry};let calls=0;u.request=async()=>{calls++;return 'unexpected'};const p=await createWalletConnect({...options,init:async()=>u});assert.deepEqual(await p.request({method:'eth_accounts'}),[]);await assert.rejects(p.connect(),/expired/);await assert.rejects(p.request({method:'personal_sign',params:[]}),/disconnected/);assert.equal(calls,0)}});
test('future-expiry restored session remains usable and expiry is reevaluated before each request',async()=>{const u=universal();u.session={...session,expiry:Math.floor(Date.now()/1000)+3600};let calls=0;u.request=async()=>{calls++;return 'result'};const p=await createWalletConnect({...options,init:async()=>u});assert.deepEqual(await p.request({method:'eth_accounts'}),[wallet]);assert.equal(await p.request({method:'personal_sign',params:['0x1234',wallet]}), 'result');u.session.expiry=1;await assert.rejects(p.request({method:'personal_sign',params:[]}),/disconnected/);assert.equal(calls,1)});
test('new explicit Cronos pairing resets stale chain event state',async()=>{const u=universal();const p=await createWalletConnect({...options,init:async()=>u});u.emit('chainChanged','eip155:1');u.connect=async()=>{u.session=session;return session};await p.connect();assert.equal(await p.request({method:'eth_chainId'}),'0x19');assert.deepEqual(await p.request({method:'eth_accounts'}),[wallet])});
test('wrong-chain signing is blocked and switch requests cannot leave Cronos',async()=>{
 const u=universal();u.session=session;let calls=0;u.request=async()=>{calls++;return null};const p=await createWalletConnect({...options,init:async()=>u});
 u.emit('chainChanged','eip155:1');assert.deepEqual(await p.request({method:'eth_accounts'}),[]);
 await assert.rejects(p.request({method:'personal_sign',params:[]}),/Authorized Cronos/);
 await assert.rejects(p.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x1'}]}),/Only Cronos/);
 await assert.rejects(p.request({method:'wallet_addEthereumChain',params:[{chainId:'bad'}]}),/Invalid target/);
 assert.equal(calls,0);await p.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x19'}]});assert.equal(calls,1);
});
test('transaction from and optional chainId must match the authorized session',async()=>{
 const u=universal();u.session=session;let calls=0;u.request=async()=>{calls++;return '0xhash'};const p=await createWalletConnect({...options,init:async()=>u});
 for(const tx of [{},{from:'0x'+'b'.repeat(40)},{from:wallet,chainId:'0x1'},{from:wallet,chainId:'invalid'}])await assert.rejects(p.request({method:'eth_sendTransaction',params:[tx]}),/sender|chain|Cronos/);
 assert.equal(calls,0);assert.equal(await p.request({method:'eth_sendTransaction',params:[{from:wallet,chainId:'0x19'}]}),'0xhash');assert.equal(calls,1);
});
test('account events expose only valid authoritative Cronos namespace accounts',async()=>{
 const u=universal();u.session=session;const p=await createWalletConnect({...options,init:async()=>u});let latest;p.on('accountsChanged',a=>latest=a);
 u.emit('accountsChanged',['malicious','0x'+'b'.repeat(40)]);assert.deepEqual(latest,[wallet]);
 u.session={namespaces:{eip155:{accounts:['eip155:1:'+wallet,'bad']}}};u.emit('session_update',{});assert.deepEqual(latest,[]);
 await assert.rejects(p.request({method:'personal_sign',params:[]}),/Authorized Cronos/);
});
test('pairing timeout quarantines the attempt and disconnects late approval',async()=>{
 const u=universal();let resolve,disconnections=0;u.connect=()=>new Promise(r=>resolve=r);u.disconnect=async()=>{disconnections++;u.session=undefined};
 const p=await createWalletConnect({...options,init:async()=>u,pairingTimeoutMs:15});await assert.rejects(p.connect(),/cancelled/);await assert.rejects(p.connect(),/still settling/);
 u.session=session;resolve(session);await tick();assert.equal(disconnections,1);assert.deepEqual(await p.request({method:'eth_accounts'}),[]);
});
test('malformed requests and invalid timeout fail before SDK invocation',async()=>{
 for(const pairingTimeoutMs of [0,-1,Infinity,300001,'100'])await assert.rejects(createWalletConnect({...options,init:async()=>universal(),pairingTimeoutMs}),/timeout/);
 const p=await createWalletConnect({...options,init:async()=>universal()});for(const args of [null,{},'personal_sign',{method:''}])await assert.rejects(p.request(args),/Invalid wallet request/);
});
test('malformed chain events clear previous chain authority until a valid Cronos event',async()=>{
 for(const event of [undefined,null,{},'bad','cosmos:25','eip155:1:25','25junk','2.5e1',-1,Infinity]){
  const u=universal();u.session=session;let calls=0;u.request=async()=>{calls++;return 'unexpected'};const p=await createWalletConnect({...options,init:async()=>u});let latest;p.on('accountsChanged',a=>latest=a);
  u.emit('chainChanged',event);assert.deepEqual(await p.request({method:'eth_accounts'}),[]);assert.deepEqual(latest,[]);await assert.rejects(p.request({method:'personal_sign',params:['0x12',wallet]}),/Authorized Cronos/);assert.equal(calls,0);
  u.emit('chainChanged','eip155:25');assert.deepEqual(await p.request({method:'eth_accounts'}),[wallet]);
 }
});
test('valid chain event formats remain compatible without implicit signing',async()=>{
 const u=universal();u.session=session;const p=await createWalletConnect({...options,init:async()=>u});
 for(const event of [25,'25','0x19','eip155:25']){u.emit('chainChanged',event);assert.equal(await p.request({method:'eth_chainId'}),'0x19');assert.deepEqual(await p.request({method:'eth_accounts'}),[wallet]);}
});
test('a mismatched chain-scoped namespace cannot authorize a Cronos account',async()=>{
 for(const key of ['eip155:1','eip155:25:extra','eip155:bad']){const u=universal();u.session={namespaces:{[key]:{accounts:['eip155:25:'+wallet]}}};const p=await createWalletConnect({...options,init:async()=>u});assert.deepEqual(await p.request({method:'eth_accounts'}),[]);await assert.rejects(p.connect(),/no authorized/);}
});
test('unknown signing/batched permission methods never reach the WalletConnect relay',async()=>{
 const u=universal();u.session=session;let calls=0;u.request=async()=>{calls++;return 'result'};const p=await createWalletConnect({...options,init:async()=>u});
 for(const method of ['eth_signTransaction','wallet_sendCalls','wallet_grantPermissions','wallet_requestPermissions','eth_signTypedData_v5','plugin_sign','unknown'])await assert.rejects(p.request({method,params:[]}),/Unsupported/);
 assert.equal(calls,0);assert.equal(await p.request({method:'eth_getBalance',params:[wallet,'latest']}),'result');assert.equal(calls,1);
});
