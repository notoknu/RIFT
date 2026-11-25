import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {royaltyEstimate,royaltyDisclosure} from '../src/exchange-royalties.js';
const recipient='0x1111111111111111111111111111111111111111';
const zero='0x0000000000000000000000000000000000000000';
const asset=(amount,to=recipient)=>({supportsInterface:async id=>{assert.equal(id,'0x2a55205a');return true},royaltyInfo:async()=>[to,amount]});
test('royalty estimate uses bigint, actual recipient and exact net proceeds',async()=>{
 const quote=await royaltyEstimate(asset(10n),0n,100n);
 assert.deepEqual(quote,{gross:100n,royalty:10n,recipient,net:90n});
 const text=royaltyDisclosure(quote);
 for(const term of ['Gross sale:','Estimated royalty:','Royalty recipient: '+recipient,'Estimated seller proceeds:','Network gas','credited for withdrawal','may change','rejected, not capped'])assert.ok(text.includes(term),term);
});
test('non-ERC2981 reports zero, without calling royaltyInfo',async()=>{
 const q=await royaltyEstimate({supportsInterface:async()=>false},1n,999999999999999999999999999n);
 assert.equal(q.net,q.gross);assert.equal(q.royalty,0n);assert.equal(q.recipient,zero);
});
test('rejects excess, rounding excess, positive zero recipient, malformed recipient and negative responses',async()=>{
 for(const [amount,to,gross] of [[11n,recipient,100n],[1n,recipient,9n],[1n,zero,100n],[0n,'broken',100n],[-1n,recipient,100n]])await assert.rejects(royaltyEstimate(asset(amount,to),1n,gross),/Unsupported royalty/);
 await assert.rejects(royaltyEstimate(asset(0n),1n,0n),/positive/);
});
test('RPC/royalty failure never silently becomes a zero-fee sale',async()=>{
 await assert.rejects(royaltyEstimate({supportsInterface:async()=>{throw Error('RPC unavailable')}},1n,100n),/RPC unavailable/);
 await assert.rejects(royaltyEstimate({supportsInterface:async()=>true,royaltyInfo:async()=>{throw Error('revert')}},1n,100n),/revert/);
});
test('listing and offer acceptance both review seller proceeds before NFT approval',()=>{
 const source=readFileSync(new URL('../src/exchange-client.js',import.meta.url),'utf8');
 for(const name of ['createListing','acceptFundedOffer']){
  const section=source.split('export async function '+name+'(')[1].split('\nexport async function ')[0];
  assert.ok(section.indexOf('await confirmSellerProceeds(')>0);
  assert.ok(section.indexOf('await confirmSellerProceeds(')<section.indexOf('await approveExchangeAsset('));
 }
});
test('post-approval royalty changes require explicit renewed consent',async()=>{
 const {recheckSellerProceeds}=await import('../src/exchange-royalties.js');const previous=await royaltyEstimate(asset(5n),1n,100n);let prompts=[];
 const unchanged=await recheckSellerProceeds(null,{tokenId:1n,gross:100n},previous,{asset:asset(5n),confirmAction:text=>{prompts.push(text);return true}});assert.equal(unchanged.net,95n);assert.equal(prompts.length,0);
 const changed=await recheckSellerProceeds(null,{tokenId:1n,gross:100n},previous,{asset:asset(10n),confirmAction:text=>{prompts.push(text);return true}});assert.equal(changed.net,90n);assert.equal(prompts.length,1);assert.match(prompts[0],/changed after/);
 await assert.rejects(recheckSellerProceeds(null,{tokenId:1n,gross:100n},previous,{asset:asset(10n),confirmAction:()=>false}),/declined/);
});
test('recipient-only changes also require renewed consent; excess rates fail without a prompt',async()=>{
 const {recheckSellerProceeds}=await import('../src/exchange-royalties.js');const previous=await royaltyEstimate(asset(5n),1n,100n);let prompts=0;
 await assert.rejects(recheckSellerProceeds(null,{tokenId:1n,gross:100n},previous,{asset:asset(5n,'0x2222222222222222222222222222222222222222'),confirmAction:()=>{prompts++;return false}}),/declined/);assert.equal(prompts,1);
 await assert.rejects(recheckSellerProceeds(null,{tokenId:1n,gross:100n},previous,{asset:asset(11n),confirmAction:()=>{prompts++;return true}}),/Unsupported royalty/);assert.equal(prompts,1);
});
test('post-approval royalty RPC failure blocks settlement instead of assuming zero',async()=>{
 const {recheckSellerProceeds}=await import('../src/exchange-royalties.js');const previous=await royaltyEstimate(asset(5n),1n,100n);
 await assert.rejects(recheckSellerProceeds(null,{tokenId:1n,gross:100n},previous,{asset:{supportsInterface:async()=>{throw Error('outage')}}}),/outage/);
});
test('seller actions refresh quotes after asset approval and before settlement',()=>{
 const source=readFileSync(new URL('../src/exchange-client.js',import.meta.url),'utf8');
 for(const name of ['createListing','acceptFundedOffer']){const section=source.split('export async function '+name+'(')[1].split('\nexport async function ')[0];assert.ok(section.indexOf('await recheckSellerProceeds(')>section.indexOf('await approveExchangeAsset('));assert.ok(section.indexOf('await recheckSellerProceeds(')<section.indexOf('return send('));}
});
