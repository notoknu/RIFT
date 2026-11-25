import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareMintReview,confirmMintReview} from '../src/mint-review.js';
const address='0x1111111111111111111111111111111111111111';
function fixture(overrides={}){
 const counts={simulations:0,sends:0};
 const state={paused:false,start:0n,end:0n,totalMinted:0n,maxSupply:10n,walletLimit:3n,txLimit:2n,mintedBy:0n,mintPrice:0n,...overrides};
 const contract=Object.fromEntries(Object.entries(state).map(([key,value])=>[key,async()=>value]));
 contract.mint=async()=>{counts.sends++};contract.mint.staticCall=async()=>{counts.simulations++};contract.mint.estimateGas=async()=>100n;
 const signer={getAddress:async()=>address,provider:{getNetwork:async()=>({chainId:25n}),getBlock:async()=>({timestamp:100}),getCode:async()=>'0x6000',getFeeData:async()=>({gasPrice:2n}),getBalance:async()=>10000n}};
 return {counts,contract,options:{signer,address,abi:[],quantity:'2',proof:[],contractFactory:()=>contract}};
}
test('free mint still discloses gas and needs explicit confirmation without sending',async()=>{
 const f=fixture();const review=await prepareMintReview(f.options);assert.equal(review.value,0n);assert.equal(review.networkFee,200n);assert.ok(review.text.includes('zero mint price does not remove gas'));assert.equal(f.counts.simulations,1);await confirmMintReview(review,()=>true);assert.equal(f.counts.simulations,2);assert.equal(f.counts.sends,0);
});
test('fresh contract price determines total rather than an earlier UI snapshot',async()=>{
 const f=fixture({mintPrice:15n});const review=await prepareMintReview(f.options);assert.equal(review.value,30n);assert.deepEqual(review.args,[2n,[],{value:30n}]);
});
test('paused, scheduled, ended, supply and wallet/transaction limits block mint',async()=>{
 for(const [change,message] of [[{paused:true},/paused/],[{start:101n},/not live/],[{end:100n},/not live/],[{totalMinted:9n},/supply/],[{mintedBy:2n},/wallet allowance/],[{txLimit:1n},/transaction limit/]]){
  const f=fixture(change);await assert.rejects(prepareMintReview(f.options),message);assert.equal(f.counts.simulations,0);assert.equal(f.counts.sends,0);
 }
});
test('wrong chain, missing code and insufficient funds block value action',async()=>{
 let f=fixture();f.options.signer.provider.getNetwork=async()=>({chainId:1n});await assert.rejects(prepareMintReview(f.options),/chain 25/);
 f=fixture();f.options.signer.provider.getCode=async()=>'0x';await assert.rejects(prepareMintReview(f.options),/no code/);
 f=fixture();f.options.signer.provider.getBalance=async()=>199n;await assert.rejects(prepareMintReview(f.options),/Insufficient CRO/);assert.equal(f.counts.sends,0);
});
test('malformed quantity/proof and unavailable fees are not accepted',async()=>{
 for(const quantity of ['0','-1','1.5','1e2','1000000'])await assert.rejects(prepareMintReview({...fixture().options,quantity}),/quantity/);
 for(const proof of [null,{},['bad'],Array(65).fill('0x'+'a'.repeat(64))])await assert.rejects(prepareMintReview({...fixture().options,proof}),/proof/);
 const f=fixture();f.options.signer.provider.getFeeData=async()=>({});await assert.rejects(prepareMintReview(f.options),/fee estimate/);
});
test('declined confirmation and changed simulation never trigger a send',async()=>{
 const f=fixture(),review=await prepareMintReview(f.options);await assert.rejects(confirmMintReview(review,()=>false),/declined/);assert.equal(f.counts.simulations,1);
 f.contract.mint.staticCall=async()=>{throw Error('allowlist rejected')};await assert.rejects(confirmMintReview(review,()=>true),/allowlist rejected/);assert.equal(f.counts.sends,0);
});
test('wallet/network changes after confirmation invalidate the review',async()=>{
 for(const change of ['wallet','chain']){const f=fixture(),review=await prepareMintReview(f.options);if(change==='wallet')f.options.signer.getAddress=async()=>'0x2222222222222222222222222222222222222222';else f.options.signer.provider.getNetwork=async()=>({chainId:1n});await assert.rejects(confirmMintReview(review,()=>true),/changed/);assert.equal(f.counts.simulations,1);assert.equal(f.counts.sends,0);}
});
test('mint windows use a valid chain timestamp and fail closed if unavailable',async()=>{
 const f=fixture({start:90n,end:101n});await prepareMintReview(f.options);
 for(const timestamp of [undefined,null,-1,'100',Infinity]){f.options.signer.provider.getBlock=async()=>({timestamp});await assert.rejects(prepareMintReview(f.options),/timestamp unavailable/);}
 assert.equal(f.counts.sends,0);
});
