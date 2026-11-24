import{expect}from'chai';import{network}from'hardhat';const{ethers}=await network.create();
describe('RIFT marketplace',()=>{let nft,m,s,b,other;beforeEach(async()=>{[s,b,other]=await ethers.getSigners();nft=await ethers.deployContract('RiftNFT');m=await ethers.deployContract('RiftMarket',[s.address]);await nft.mint('ipfs://metadata');await nft.approve(await m.getAddress(),0);});
it('escrows, sells, and lets seller withdraw exactly once',async()=>{await m.list(await nft.getAddress(),0,1000);expect(await nft.ownerOf(0)).eq(await m.getAddress());await expect(m.connect(b).buy(0,{value:1000})).emit(m,'Purchased');expect(await nft.ownerOf(0)).eq(b.address);expect(await m.proceeds(s.address)).eq(1000);await expect(m.withdraw()).changeEtherBalance(ethers,s,1000);await expect(m.withdraw()).revertedWith('No proceeds');await expect(m.connect(b).buy(0,{value:1000})).revertedWith('Inactive');});
it('rejects wrong payment and non-seller cancellation',async()=>{await m.list(await nft.getAddress(),0,1000);await expect(m.connect(b).buy(0,{value:999})).revertedWith('Wrong payment');await expect(m.connect(b).cancel(0)).revertedWith('Not seller');});
it('allows seller cancellation while paused',async()=>{await m.list(await nft.getAddress(),0,1000);await m.pause();await expect(m.connect(b).buy(0,{value:1000})).revertedWithCustomError(m,'EnforcedPause');await m.cancel(0);expect(await nft.ownerOf(0)).eq(s.address);});
it('rejects non-owners, zero price and self-purchase',async()=>{await expect(m.connect(b).list(await nft.getAddress(),0,100)).revertedWith('Not owner');await expect(m.list(await nft.getAddress(),0,0)).revertedWith('Zero price');await m.list(await nft.getAddress(),0,100);await expect(m.buy(0,{value:100})).revertedWith('Own listing');});
it('restricts emergency pause to admin',async()=>{await expect(m.connect(other).pause()).revertedWithCustomError(m,'OwnableUnauthorizedAccount');});
});

describe('RIFT custody admission',()=>{
 it('rejects unsolicited safe transfers without moving the token',async()=>{
  const [s]=await ethers.getSigners(),nft=await ethers.deployContract('RiftNFT'),m=await ethers.deployContract('RiftMarket',[s.address]);
  await nft.mint('ipfs://original');
  await expect(nft['safeTransferFrom(address,address,uint256)'](s.address,await m.getAddress(),0)).revertedWith('Unexpected NFT transfer');
  expect(await nft.ownerOf(0)).eq(s.address);
  await expect(m.onERC721Received(s.address,s.address,0,'0x')).revertedWith('Unexpected NFT transfer');
 });
});
