import {expect} from 'chai';import {network} from 'hardhat';
const {ethers}=await network.create();
describe('Seeded local v2 conservation model (not an audit)',()=>{
 it('preserves ERC1155 supply and exactly backs proceeds across 32 listing/offer sequences',async()=>{
  const [seller,buyer,royalty]=await ethers.getSigners();const exchange=await ethers.deployContract('RiftExchange',[seller.address]),multi=await ethers.deployContract('Exchange1155');await multi.setApprovalForAll(await exchange.getAddress(),true);await multi.royalty(royalty.address,750);
  let seed=0x52494654;const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n};const owed=new Map([[seller.address,0n],[buyer.address,0n],[royalty.address,0n]]);
  async function check(){let total=0n;for(const who of [seller,buyer,royalty]){expect(await exchange.proceeds(who.address)).eq(owed.get(who.address));total+=owed.get(who.address)}expect(await ethers.provider.getBalance(await exchange.getAddress())).eq(total)}
  for(let step=0;step<32;step++){
   const quantity=BigInt(2+random(18)),fill=BigInt(1+random(Number(quantity))),price=BigInt(1+random(100000)),gross=price*fill,cut=gross*750n/10000n;
   await multi.mint(seller.address,step,quantity);
   if(step%2===0){
    const id=await exchange.nextListing();await exchange.list(await multi.getAddress(),step,quantity,price,0,ethers.ZeroAddress,true);
    await expect(exchange.connect(buyer).buy(id,quantity+1n,{value:price*(quantity+1n)})).revertedWith('Inactive/quantity');expect((await exchange.listings(id)).remaining).eq(quantity);
    await exchange.connect(buyer).buy(id,fill,{value:gross});expect(await multi.balanceOf(await exchange.getAddress(),step)).eq(quantity-fill);
    if(fill<quantity)await exchange.cancelListing(id);
   }else{
    const id=await exchange.nextOffer(),expiry=Number((await ethers.provider.getBlock('latest')).timestamp)+10000;
    await exchange.connect(buyer).makeOffer(await multi.getAddress(),step,price,quantity,expiry,0,ethers.ZeroHash,true,{value:price*quantity});
    await expect(exchange.acceptOffer(id,step,quantity+1n,[])).revertedWith('Closed/expired');expect((await exchange.offers(id)).remaining).eq(quantity);
    await exchange.acceptOffer(id,step,fill,[]);
    if(fill<quantity){await exchange.connect(buyer).closeOffer(id);owed.set(buyer.address,owed.get(buyer.address)+price*(quantity-fill))}
   }
   owed.set(seller.address,owed.get(seller.address)+gross-cut);owed.set(royalty.address,owed.get(royalty.address)+cut);
   expect(await multi.balanceOf(buyer.address,step)).eq(fill);expect(await multi.balanceOf(seller.address,step)).eq(quantity-fill);expect(await multi.balanceOf(await exchange.getAddress(),step)).eq(0);await check();
   if(step%4===3){for(const who of [seller,buyer,royalty])if(owed.get(who.address)>0n){await exchange.connect(who).withdrawTo(who.address);owed.set(who.address,0n)}await check()}
  }
 });
});
