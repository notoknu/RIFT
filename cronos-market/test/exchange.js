import {tokenCriteria} from '../shared/token-criteria.js';
import {decodeExchangeLog} from '../shared/exchange.js';
import {expect}from'chai';import{network}from'hardhat';const{ethers}=await network.create();
describe('RIFT v2 funded exchange — local, unreviewed',()=>{
 let exchange,nft,multi,seller,buyer,other,royalty;
 beforeEach(async()=>{[seller,buyer,other,royalty]=await ethers.getSigners();exchange=await ethers.deployContract('RiftExchange',[seller.address]);nft=await ethers.deployContract('RiftNFT');multi=await ethers.deployContract('Exchange1155');await nft.mint('ipfs://test');await nft.approve(await exchange.getAddress(),0);await multi.mint(seller.address,1,10);await multi.setApprovalForAll(await exchange.getAddress(),true)});
 const future=async()=>Number((await ethers.provider.getBlock('latest')).timestamp)+3600;
 it('partially sells ERC1155, pays actual bounded royalties and returns residual escrow',async()=>{
  await multi.royalty(royalty.address,500);await exchange.list(await multi.getAddress(),1,5,100,0,ethers.ZeroAddress,true);await exchange.connect(buyer).buy(0,2,{value:200});expect(await multi.balanceOf(buyer.address,1)).eq(2);expect(await exchange.proceeds(seller.address)).eq(190);expect(await exchange.proceeds(royalty.address)).eq(10);await exchange.cancelListing(0);expect(await multi.balanceOf(seller.address,1)).eq(8);await expect(exchange.withdrawTo(seller.address)).changeEtherBalance(ethers,seller,190);
 });
 it('enforces private buyer, exact payment and expiry',async()=>{
  const expiry=await future();await exchange.list(await nft.getAddress(),0,1,100,expiry,buyer.address,false);await expect(exchange.connect(other).buy(0,1,{value:100})).revertedWith('Buyer restricted');await expect(exchange.connect(buyer).buy(0,1,{value:99})).revertedWith('Wrong payment');await ethers.provider.send('evm_setNextBlockTimestamp',[expiry]);await expect(exchange.connect(buyer).buy(0,1,{value:100})).revertedWith('Expired');await exchange.cancelListing(0);expect(await nft.ownerOf(0)).eq(seller.address);
 });
 it('executes a mixed ERC721/ERC1155 bulk purchase atomically',async()=>{
  await exchange.list(await nft.getAddress(),0,1,100,0,ethers.ZeroAddress,false);await exchange.list(await multi.getAddress(),1,5,20,0,ethers.ZeroAddress,true);
  await expect(exchange.connect(buyer).buyBatch([0,1],[1,6],{value:220})).revertedWith('Inactive/quantity');expect((await exchange.listings(0)).remaining).eq(1);expect(await nft.ownerOf(0)).eq(await exchange.getAddress());
  await exchange.connect(buyer).buyBatch([0,1],[1,2],{value:140});expect(await nft.ownerOf(0)).eq(buyer.address);expect(await multi.balanceOf(buyer.address,1)).eq(2);expect(await exchange.proceeds(seller.address)).eq(140);
 });
 it('rejects unsolicited safe deposits of either standard',async()=>{
  await expect(nft['safeTransferFrom(address,address,uint256)'](seller.address,await exchange.getAddress(),0)).revertedWith('Unexpected NFT transfer');await expect(multi.safeTransferFrom(seller.address,await exchange.getAddress(),1,1,'0x')).revertedWith('Unexpected NFT transfer');
  await multi.mint(seller.address,2,1);await expect(multi.safeBatchTransferFrom(seller.address,await exchange.getAddress(),[1,2],[1,1],'0x')).revertedWith('Batch deposits disabled');
 });
 it('funds exact ERC721 offers, prevents wrong-token fills and permits one withdrawal only',async()=>{
  await exchange.connect(buyer).makeOffer(await nft.getAddress(),0,100,1,await future(),0,ethers.ZeroHash,false,{value:100});await expect(exchange.acceptOffer(0,1,1,[])).revertedWith('Wrong token');await exchange.acceptOffer(0,0,1,[]);expect(await nft.ownerOf(0)).eq(buyer.address);expect(await exchange.proceeds(seller.address)).eq(100);await expect(exchange.acceptOffer(0,0,1,[])).revertedWith('Closed/expired');await exchange.withdrawTo(other.address);expect(await exchange.proceeds(seller.address)).eq(0);await expect(exchange.withdrawTo(seller.address)).revertedWith('No proceeds');
 });
 it('supports collection offers with partial fills and refunds only unused funding',async()=>{
  await exchange.connect(buyer).makeOffer(await multi.getAddress(),0,25,6,await future(),1,ethers.ZeroHash,true,{value:150});await exchange.acceptOffer(0,1,2,[]);expect(await exchange.proceeds(seller.address)).eq(50);await exchange.connect(buyer).closeOffer(0);expect(await exchange.proceeds(buyer.address)).eq(100);await expect(exchange.connect(buyer).closeOffer(0)).revertedWith('Not buyer/unexpired');expect(await ethers.provider.getBalance(await exchange.getAddress())).eq(150);
 });
 it('checks immutable token-ID criteria roots and bounds ERC721 reuse',async()=>{
  const leaf=id=>ethers.keccak256(ethers.concat([ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['uint256'],[id]))]));
  await exchange.connect(buyer).makeOffer(await nft.getAddress(),0,100,2,await future(),2,leaf(0),false,{value:200});await expect(exchange.acceptOffer(0,1,1,[])).revertedWith('Invalid criteria proof');await exchange.acceptOffer(0,0,1,[]);
  await nft.connect(buyer).transferFrom(buyer.address,seller.address,0);await nft.approve(await exchange.getAddress(),0);await expect(exchange.acceptOffer(0,0,1,[])).revertedWith('Token already filled');
 });
 it('permits exits when paused and expired refunds by any keeper without theft',async()=>{
  const expiry=await future();await exchange.list(await nft.getAddress(),0,1,100,0,ethers.ZeroAddress,false);await exchange.connect(buyer).makeOffer(await multi.getAddress(),0,100,1,expiry,1,ethers.ZeroHash,true,{value:100});await exchange.pause();await expect(exchange.connect(buyer).buy(0,1,{value:100})).revertedWithCustomError(exchange,'EnforcedPause');await exchange.cancelListing(0);await expect(exchange.connect(other).closeOffer(0)).revertedWith('Not buyer/unexpired');await ethers.provider.send('evm_setNextBlockTimestamp',[expiry]);await exchange.connect(other).closeOffer(0);expect(await exchange.proceeds(buyer.address)).eq(100);expect(await exchange.proceeds(other.address)).eq(0);
 });
 it('rejects unsupported royalties without losing funds or inventory',async()=>{
  await multi.royalty(royalty.address,1001);await exchange.list(await multi.getAddress(),1,2,10000,0,ethers.ZeroAddress,true);await expect(exchange.connect(buyer).buy(0,1,{value:10000})).revertedWith('Unsupported royalty');expect((await exchange.listings(0)).remaining).eq(2);expect(await exchange.proceeds(seller.address)).eq(0);expect(await ethers.provider.getBalance(await exchange.getAddress())).eq(0);
 });
 it('rejects malformed offers, quantities, invalid batches and unauthorized administration',async()=>{
  await expect(exchange.list(await nft.getAddress(),0,2,100,0,ethers.ZeroAddress,false)).revertedWith('Invalid quantity');await expect(exchange.connect(buyer).makeOffer(await nft.getAddress(),0,100,1,await future(),0,ethers.ZeroHash,false,{value:99})).revertedWith('Wrong funding');await expect(exchange.connect(buyer).makeOffer(await nft.getAddress(),0,100,1,await future(),2,ethers.ZeroHash,false,{value:100})).revertedWith('Invalid criteria');await expect(exchange.connect(buyer).pause()).revertedWithCustomError(exchange,'OwnableUnauthorizedAccount');await expect(exchange.buyBatch([],[],{value:0})).revertedWith('Invalid batch');
 });
 it('rolls back rejected NFT callbacks and blocks reentrant calls from malicious receivers',async()=>{
  const receiver=await ethers.deployContract('ExchangeReceiver',[await exchange.getAddress()]);await exchange.list(await multi.getAddress(),1,2,100,0,ethers.ZeroAddress,true);
  await receiver.configure(true,false);await expect(receiver.buy(0,1,{value:100})).revertedWith('Receiver rejects NFT');expect((await exchange.listings(0)).remaining).eq(2);expect(await exchange.proceeds(seller.address)).eq(0);expect(await ethers.provider.getBalance(await exchange.getAddress())).eq(0);
  await receiver.configure(false,false);await receiver.buy(0,1,{value:100});expect(await receiver.attempted()).eq(true);expect(await receiver.reentrySucceeded()).eq(false);expect((await exchange.listings(0)).remaining).eq(1);
 });

 it('uses the shared indexed ABI and accepts multi-leaf criteria proofs generated by the UI',async()=>{
  const pack=tokenCriteria('0,1,2,340282366920938463463374607431768211456');
  const tx=await exchange.connect(buyer).makeOffer(await nft.getAddress(),0,100,2,await future(),2,pack.root,false,{value:200});const receipt=await tx.wait();const decoded=decodeExchangeLog(receipt.logs[0]);expect(decoded.kind).eq('OfferMade');expect(decoded.payload.unitPrice).eq('100');
  await exchange.acceptOffer(0,0,1,pack.claims['0']);expect(await nft.ownerOf(0)).eq(buyer.address);
 });

 it('restores credits after rejected payments and blocks withdrawal reentry',async()=>{
  const receiver=await ethers.deployContract('ExchangeReceiver',[await exchange.getAddress()]);await receiver.offer(await multi.getAddress(),await future(),{value:100});await receiver.close(0);await receiver.configure(false,true);await expect(receiver.withdraw()).revertedWith('Withdrawal failed');expect(await exchange.proceeds(await receiver.getAddress())).eq(100);expect(await ethers.provider.getBalance(await exchange.getAddress())).eq(100);
  await receiver.configure(false,false);await receiver.withdraw();expect(await receiver.reentrySucceeded()).eq(false);expect(await exchange.proceeds(await receiver.getAddress())).eq(0);expect(await ethers.provider.getBalance(await exchange.getAddress())).eq(0);
 });
 it('preserves exact native liabilities through a sequence of partial fills, closes and withdrawals',async()=>{
  await multi.mint(seller.address,1,1000);let expectedSeller=0n,expectedBuyer=0n;
  for(let i=0;i<20;i++){const quantity=BigInt(1+(i*7)%9),filled=BigInt((i*11)%Number(quantity+1n)),price=BigInt(1+i*31);await exchange.connect(buyer).makeOffer(await multi.getAddress(),0,price,quantity,await future(),1,ethers.ZeroHash,true,{value:price*quantity});if(filled){await exchange.acceptOffer(i,1,filled,[]);expectedSeller+=price*filled}if(quantity>filled){await exchange.connect(buyer).closeOffer(i);expectedBuyer+=price*(quantity-filled)}expect(await ethers.provider.getBalance(await exchange.getAddress())).eq(expectedSeller+expectedBuyer);expect(await exchange.proceeds(seller.address)).eq(expectedSeller);expect(await exchange.proceeds(buyer.address)).eq(expectedBuyer);}
  await exchange.withdrawTo(seller.address);await exchange.connect(buyer).withdrawTo(buyer.address);expect(await ethers.provider.getBalance(await exchange.getAddress())).eq(0);
 });

});
