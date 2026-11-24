import test from 'node:test';import assert from 'node:assert/strict';
import {trackedTransaction,readTransactions,reconcileTransactions} from '../src/transactions.js';import {parseRoute} from '../src/navigation.js';
const wallet='0x1111111111111111111111111111111111111111',hash='0x'+'a'.repeat(64),otherHash='0x'+'b'.repeat(64);
const blockHash='0x'+'c'.repeat(64),shape={from:wallet,nonce:7,to:wallet,data:'0x1234',value:1n};
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}};
const signer={getAddress:async()=>wallet,provider:{getNetwork:async()=>({chainId:25n})}};
test('transaction hash survives an interrupted confirmation; receipt reconciliation never sends',async()=>{
 const s=storage();let sent=0;await assert.rejects(trackedTransaction('List NFT',signer,async()=>{sent++;return {...shape,hash,wait:async()=>{throw Error('disconnected')}}},{},s));
 assert.equal(readTransactions(s)[0].status,'submitted-uncertain');assert.equal(readTransactions(s)[0].hash,hash);
 const result=await reconcileTransactions({getNetwork:signer.provider.getNetwork,getTransactionReceipt:async()=>({hash,from:wallet,status:1,blockNumber:101,blockHash})},wallet,s);assert.equal(result[0].status,'confirmed');assert.equal(sent,1);
});
test('replacement, cancellation, wrong chain and unavailable recovery storage are explicit',async()=>{
 const s=storage();const replacementError={code:'TRANSACTION_REPLACED',cancelled:false,replacement:{...shape,hash:otherHash},receipt:{hash:otherHash,from:wallet,status:1,blockNumber:10,blockHash}};
 await trackedTransaction('Buy',signer,async()=>({...shape,hash,wait:async()=>{throw replacementError}}),{},s);assert.equal(readTransactions(s)[0].hash,otherHash);assert.equal(readTransactions(s)[0].status,'confirmed');
 await assert.rejects(trackedTransaction('Buy',signer,async()=>({...shape,hash,wait:async()=>{throw {...replacementError,cancelled:true}}}),{},s));assert.equal(readTransactions(s)[0].status,'cancelled');
 let called=false;await assert.rejects(trackedTransaction('Buy',{...signer,provider:{getNetwork:async()=>({chainId:1n})}},async()=>{called=true},{},s));assert.equal(called,false);
 await assert.rejects(trackedTransaction('Buy',signer,async()=>{called=true},{},{getItem(){return null},setItem(){throw Error('disabled')}}));assert.equal(called,false);
});
test('shareable Cronos routes reject unsupported chains and overflowing token IDs',()=>{
 const route=path=>parseRoute(new URL('https://rift.example'+path));assert.equal(route('/create').tab,'Launch');assert.equal(route('/market').tab,'Buy & sell');assert.equal(route('/profile/'+wallet).kind,'profile');assert.equal(route('/collection/'+wallet).kind,'collection');assert.equal(route('/assets/25/'+wallet+'/1').tokenId,'1');assert.equal(route('/assets/1/'+wallet+'/1').kind,'notfound');assert.equal(route('/assets/25/'+wallet+'/'+(2n**256n)).kind,'notfound');
});

test('write-route policy denies unowned APIs and wrong methods',async()=>{
 const {creatorRoute}=await import('../shared/creator-routes.js');
 assert.equal(creatorRoute('/api/v1/storage/verify','POST').allowed,false);
 assert.equal(creatorRoute('/api/v1/collections/anything','DELETE').allowed,false);
 assert.equal(creatorRoute('/api/v1/auth/session','POST').allowed,false);
 assert.equal(creatorRoute('/api/v1/auth/nonce?x=1','POST').allowed,true);
 assert.equal(creatorRoute('/api/v1/collections/'+wallet+'/presentation','PATCH').allowed,true);
 assert.equal(creatorRoute('/api/v1/launch-drafts/'+'a'.repeat(64),'DELETE').allowed,true);
});

test('factory recovery decodes only a matching creator event from the configured factory',async()=>{
 const {Interface}=await import('ethers'),iface=new Interface(['event DropCreated(address indexed drop,address indexed creator,uint8 mode,uint256 supply,uint256 templateVersion)']);
 const factory='0x2222222222222222222222222222222222222222',drop='0x3333333333333333333333333333333333333333',encoded=iface.encodeEventLog(iface.getEvent('DropCreated'),[drop,wallet,0,100,1]);
 const receipt={hash,from:wallet,status:1,blockHash,blockNumber:20,logs:[{address:factory,...encoded}]},s=storage();
 await assert.rejects(trackedTransaction('Deploy collection via factory',signer,async()=>({...shape,hash,wait:async()=>{throw Error('offline')}}),{factory},s));
 let rows=await reconcileTransactions({getNetwork:signer.provider.getNetwork,getTransactionReceipt:async()=>receipt},wallet,s);assert.equal(rows[0].contractAddress,drop);
 const forged=storage();await trackedTransaction('Deploy',signer,async()=>({...shape,hash,wait:async()=>({...receipt,logs:[{address:wallet,...encoded}]})}),{factory},forged);assert.equal(readTransactions(forged)[0].contractAddress,null);
});
test('different live replacement never unlocks a dependent action',async()=>{const s=storage();let dependent=0;await assert.rejects((async()=>{await trackedTransaction('Approve',signer,async()=>({...shape,hash,wait:async()=>{throw {code:'TRANSACTION_REPLACED',cancelled:false,replacement:{...shape,hash:otherHash,data:'0x5678'},receipt:{hash:otherHash,from:wallet,status:1,blockHash,blockNumber:10}}}}),{},s);dependent++})(),/semantics/);assert.equal(dependent,0);assert.equal(readTransactions(s)[0].status,'replaced-different')});
test('wrong receipt identity/status or wallet transaction identity blocks dependent actions',async()=>{for(const patch of [{hash:otherHash},{from:'0x'+'2'.repeat(40)},{status:null},{status:true},{status:2},{blockHash:'invalid'},{blockNumber:-1}]){const s=storage();await assert.rejects(trackedTransaction('Buy',signer,async()=>({...shape,hash,wait:async()=>({hash,from:wallet,status:1,blockHash,blockNumber:10,...patch})}),{},s),/Receipt identity/);assert.equal(readTransactions(s)[0].status,'submitted-uncertain')}const s=storage();await assert.rejects(trackedTransaction('Buy',signer,async()=>({...shape,hash,from:'0x'+'2'.repeat(40),wait:async()=>{throw Error('must not wait')}}),{},s),/inconsistent transaction/)});
test('recent confirmation is revisited, missing receipt flags reorg and later inclusion recovers',async()=>{const s=storage(),receipt={hash,from:wallet,status:1,blockHash,blockNumber:10,contractAddress:wallet};await trackedTransaction('Deploy',signer,async()=>({...shape,hash,wait:async()=>receipt}),{},s);assert.equal(readTransactions(s)[0].contractAddress,wallet);let r=await reconcileTransactions({getNetwork:signer.provider.getNetwork,getTransactionReceipt:async()=>null},wallet,s);assert.equal(r[0].status,'reorg-uncertain');assert.equal(r[0].contractAddress,undefined);r=await reconcileTransactions({getNetwork:signer.provider.getNetwork,getTransactionReceipt:async()=>({...receipt,blockNumber:12})},wallet,s);assert.equal(r[0].status,'confirmed');assert.equal(r[0].blockNumber,12)});
