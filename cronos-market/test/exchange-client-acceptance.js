import {inspectExchangeApprovals,revokeExchangeApproval} from '../src/exchange-approvals.js';
import {expect} from 'chai';
import assert from 'node:assert/strict';
import {network} from 'hardhat';
import {createListing,buyListings,makeFundedOffer,acceptFundedOffer,exchangeExit} from '../src/exchange-client.js';
import {readTransactions} from '../src/transactions.js';

// Local EDR only; production capabilities and wallet confirmations are controlled fixtures.
const {ethers}=await network.create({network:'default',override:{chainId:25}});
describe('Marketplace client -> compiled v2 exchange — LOCAL SIMULATION ONLY',()=>{
 let seller,buyer,royalty,exchange,nft,multi,address,cap,old,confirmations;
 beforeEach(async()=>{
  [seller,buyer,royalty]=await ethers.getSigners();
  exchange=await ethers.deployContract('RiftExchange',[seller.address]);nft=await ethers.deployContract('RiftNFT');multi=await ethers.deployContract('Exchange1155');
  await Promise.all([exchange.waitForDeployment(),nft.waitForDeployment(),multi.waitForDeployment()]);
  address=await exchange.getAddress();cap={configured:true,tradingEnabled:true,address,runtimeHash:ethers.keccak256(await ethers.provider.getCode(address))};
  old={fetch:globalThis.fetch,confirm:globalThis.confirm,localStorage:globalThis.localStorage};
  const records=new Map();globalThis.localStorage={getItem:key=>records.get(key)||null,setItem:(key,value)=>records.set(key,value)};
  globalThis.fetch=async url=>{assert.equal(url,'/api/v1/exchange/capabilities');return Response.json(cap)};
  confirmations=[];globalThis.confirm=text=>{confirmations.push(text);return true};
 });
 afterEach(()=>{globalThis.fetch=old.fetch;globalThis.confirm=old.confirm;if(old.localStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=old.localStorage;});
 const input=nft=>({nft,tokenId:'0',quantity:'1',price:'0.0000000000000001',multi:false,expiry:0});
 it('lists with token-only approval, buys through the client, and withdraws exact seller credit',async()=>{
  await(await nft.mint('ipfs://local')).wait();
  const listing=await createListing(seller,{...input(await nft.getAddress()),exchangeAddress:address});expect(listing.status).eq(1);
  expect(await nft.isApprovedForAll(seller.address,address)).eq(false);expect(await nft.ownerOf(0)).eq(address);
  expect(confirmations.some(text=>text.includes('Estimated seller proceeds:'))).eq(true);
  await buyListings(buyer,[{id:'0',quantity:'1',unitPrice:'100',nft:await nft.getAddress(),tokenId:'0',multi:false,exchange:address}]);
  expect(await nft.ownerOf(0)).eq(buyer.address);expect(await exchange.proceeds(seller.address)).eq(100n);
  await exchangeExit(seller,'withdrawTo',undefined,address);expect(await exchange.proceeds(seller.address)).eq(0n);expect(await ethers.provider.getBalance(address)).eq(0n);
  expect(readTransactions().every(record=>record.status==='confirmed')).eq(true);
 });
 it('partially buys ERC1155 with royalty disclosure, then cancels residual escrow',async()=>{
  await(await multi.mint(seller.address,1,5)).wait();await(await multi.royalty(royalty.address,500)).wait();
  await createListing(seller,{...input(await multi.getAddress()),tokenId:'1',quantity:'5',multi:true,exchangeAddress:address});
  expect(confirmations.some(text=>text.includes('Royalty recipient: '+royalty.address))).eq(true);expect(confirmations.some(text=>text.includes('ALL tokens'))).eq(true);
  await buyListings(buyer,[{id:'0',quantity:'2',unitPrice:'100',exchange:address}]);
  expect(await multi.balanceOf(buyer.address,1)).eq(2n);expect(await exchange.proceeds(seller.address)).eq(190n);expect(await exchange.proceeds(royalty.address)).eq(10n);
  await exchangeExit(seller,'cancelListing','0',address);expect(await multi.balanceOf(seller.address,1)).eq(3n);
 });
 it('funds, partially fills, closes and withdraws an offer through real client functions',async()=>{
  await(await multi.mint(seller.address,1,3)).wait();const head=await ethers.provider.getBlock('latest');
  await makeFundedOffer(buyer,{...input(await multi.getAddress()),tokenId:'1',quantity:'3',multi:true,scope:0,expiry:Number(head.timestamp)+3600,exchangeAddress:address});
  expect(await ethers.provider.getBalance(address)).eq(300n);
  await acceptFundedOffer(seller,{id:'0',tokenId:'1',quantity:'1',exchangeAddress:address});expect(await multi.balanceOf(buyer.address,1)).eq(1n);
  await exchangeExit(buyer,'closeOffer','0',address);expect(await exchange.proceeds(buyer.address)).eq(200n);expect(await exchange.proceeds(seller.address)).eq(100n);
  await exchangeExit(buyer,'withdrawTo',undefined,address);await exchangeExit(seller,'withdrawTo',undefined,address);expect(await ethers.provider.getBalance(address)).eq(0n);
 });
 it('disabled trading or runtime mismatch cannot request NFT approval',async()=>{
  await(await nft.mint('ipfs://local')).wait();const nonce=await ethers.provider.getTransactionCount(seller.address);
  cap.tradingEnabled=false;await assert.rejects(createListing(seller,{...input(await nft.getAddress()),exchangeAddress:address}),/not enabled/);
  cap.tradingEnabled=true;cap.runtimeHash=ethers.ZeroHash;await assert.rejects(createListing(seller,{...input(await nft.getAddress()),exchangeAddress:address}),/runtime differs/);
  expect(await ethers.provider.getTransactionCount(seller.address)).eq(nonce);expect(await nft.getApproved(0)).eq(ethers.ZeroAddress);expect(confirmations.length).eq(0);
 });
 it('declined seller disclosure blocks approval and listing',async()=>{
  await(await nft.mint('ipfs://local')).wait();globalThis.confirm=()=>false;
  await assert.rejects(createListing(seller,{...input(await nft.getAddress()),exchangeAddress:address}),/declined/);expect(await nft.getApproved(0)).eq(ethers.ZeroAddress);expect(await exchange.nextListing()).eq(0n);
 });
 it('rejects self-directed private listings before requesting approval',async()=>{
  await(await nft.mint('ipfs://local')).wait();const nonce=await ethers.provider.getTransactionCount(seller.address);
  await assert.rejects(createListing(seller,{...input(await nft.getAddress()),buyer:seller.address,exchangeAddress:address}),/cannot be the seller/);expect(await nft.getApproved(0)).eq(ethers.ZeroAddress);expect(await ethers.provider.getTransactionCount(seller.address)).eq(nonce);
 });
 it('rechecks operator activation after approval and does not escrow when disabled',async()=>{
  await(await nft.mint('ipfs://local')).wait();let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({...cap,tradingEnabled:calls===1})};
  await assert.rejects(createListing(seller,{...input(await nft.getAddress()),exchangeAddress:address}),/not enabled/);
  expect(calls).eq(2);expect(await nft.ownerOf(0)).eq(seller.address);expect(await exchange.nextListing()).eq(0n);
  // Approval already confirmed before the operator changed state; it is NOT undone.
  expect(await nft.getApproved(0)).eq(address);
 });
 it('keeps cancellation available when new trading is disabled',async()=>{
  await(await nft.mint('ipfs://local')).wait();await createListing(seller,{...input(await nft.getAddress()),exchangeAddress:address});cap.tradingEnabled=false;
  await exchangeExit(seller,'cancelListing','0',address);expect(await nft.ownerOf(0)).eq(seller.address);
 });

 it('changed royalty after actual approval can be declined before escrow submission',async()=>{
  await(await multi.mint(seller.address,1,2)).wait();await(await multi.royalty(royalty.address,500)).wait();
  const nftAddress=await multi.getAddress();
  const approvalSigner=new Proxy(seller,{get(target,key){
   if(key==='sendTransaction')return async transaction=>{
    const tx=await target.sendTransaction(transaction);
    if(transaction.to?.toLowerCase()!==nftAddress.toLowerCase())return tx;
    await tx.wait();await(await multi.royalty(royalty.address,1000)).wait();return tx;
   };
   const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
  }});
  globalThis.confirm=text=>{confirmations.push(text);return !text.includes('changed after your earlier review')};
  await assert.rejects(createListing(approvalSigner,{...input(nftAddress),tokenId:'1',quantity:'2',multi:true,exchangeAddress:address}),/Changed royalty review declined/);
  expect(await multi.isApprovedForAll(seller.address,address)).eq(true);expect(await multi.balanceOf(seller.address,1)).eq(2n);expect(await exchange.nextListing()).eq(0n);expect(confirmations.some(text=>text.includes('changed after your earlier review'))).eq(true);
 });

 it('inspects and revokes only the owned ERC721 token approval while trading is disabled',async()=>{
  await(await nft.mint('ipfs://local')).wait();await(await nft.approve(address,0)).wait();cap.tradingEnabled=false;
  const input={nft:await nft.getAddress(),tokenId:'0',exchangeAddress:address};const before=await inspectExchangeApprovals(seller,input);expect(before.tokenApproved).eq(true);expect(before.collectionApproved).eq(false);
  await revokeExchangeApproval(seller,input,{scope:'token',confirmAction:()=>true});expect(await nft.getApproved(0)).eq(ethers.ZeroAddress);expect(await nft.ownerOf(0)).eq(seller.address);expect(readTransactions().at(0).status).eq('confirmed');
 });
 it('revokes ERC1155 operator approval without cancelling or reclaiming active escrow',async()=>{
  await(await multi.mint(seller.address,1,5)).wait();await createListing(seller,{...input(await multi.getAddress()),tokenId:'1',quantity:'3',multi:true,exchangeAddress:address});
  const inspection={nft:await multi.getAddress(),multi:true,exchangeAddress:address};expect((await inspectExchangeApprovals(seller,inspection)).collectionApproved).eq(true);
  await revokeExchangeApproval(seller,inspection,{scope:'collection',confirmAction:()=>true});expect(await multi.isApprovedForAll(seller.address,address)).eq(false);expect(await multi.balanceOf(address,1)).eq(3n);expect((await exchange.listings(0)).remaining).eq(3n);
  await exchangeExit(seller,'cancelListing','0',address);expect(await multi.balanceOf(seller.address,1)).eq(5n);
 });
 it('will not clear an unrelated token spender and respects declined revocation',async()=>{
  await(await nft.mint('ipfs://local')).wait();await(await nft.approve(royalty.address,0)).wait();const input={nft:await nft.getAddress(),tokenId:'0',exchangeAddress:address};
  expect((await inspectExchangeApprovals(seller,input)).tokenApproved).eq(false);await assert.rejects(revokeExchangeApproval(seller,input,{scope:'token',confirmAction:()=>true}),/No matching/);expect(await nft.getApproved(0)).eq(royalty.address);
  await(await nft.approve(address,0)).wait();const nonce=await ethers.provider.getTransactionCount(seller.address);await assert.rejects(revokeExchangeApproval(seller,input,{scope:'token',confirmAction:()=>false}),/declined/);expect(await nft.getApproved(0)).eq(address);expect(await ethers.provider.getTransactionCount(seller.address)).eq(nonce);
 });
 it('does not report another owners token-specific approval as the connected wallets permission',async()=>{
  await(await nft.mint('ipfs://local')).wait();await(await nft.approve(address,0)).wait();const input={nft:await nft.getAddress(),tokenId:'0',exchangeAddress:address};
  expect((await inspectExchangeApprovals(buyer,input)).tokenApproved).eq(false);await assert.rejects(revokeExchangeApproval(buyer,input,{scope:'token',confirmAction:()=>true}),/No matching/);expect(await nft.getApproved(0)).eq(address);
 });

});
