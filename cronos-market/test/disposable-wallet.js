import {expect} from 'chai';
import {network} from 'hardhat';
import {mkdir,writeFile} from 'node:fs/promises';
const {ethers}=await network.create();
describe('Fresh disposable wallets — LOCAL SIMULATION ONLY',()=>{
 it('creates new seller/buyer wallets and signs mint/list/buy/cancel/withdraw transactions',async()=>{
  const chain=await ethers.provider.getNetwork();expect(chain.chainId).eq(31337n); // Only our explicit local simulation, never a public chain.
  const sellerKey=ethers.Wallet.createRandom().connect(ethers.provider),buyerKey=ethers.Wallet.createRandom().connect(ethers.provider);
  const seller=new ethers.NonceManager(sellerKey),buyer=new ethers.NonceManager(buyerKey);
  for(const w of [sellerKey,buyerKey])await ethers.provider.send('hardhat_setBalance',[w.address,ethers.toBeHex(ethers.parseEther('10'))]);
  const market=await ethers.deployContract('RiftMarket',[sellerKey.address],seller),nft=await ethers.deployContract('RiftNFT',[],seller);
  await Promise.all([market.waitForDeployment(),nft.waitForDeployment()]);
  await(await nft.mint('ipfs://local-wallet-test/0.json')).wait();
  await(await nft.approve(await market.getAddress(),0)).wait();
  const price=ethers.parseEther('0.1');await(await market.list(await nft.getAddress(),0,price)).wait();
  await expect(market.connect(buyer).buy(0,{value:price-1n})).revertedWith('Wrong payment');buyer.reset();
  await(await market.connect(buyer).buy(0,{value:price})).wait();
  expect(await nft.ownerOf(0)).eq(buyerKey.address);expect(await market.proceeds(sellerKey.address)).eq(price);
  await(await market.withdraw()).wait();expect(await market.proceeds(sellerKey.address)).eq(0);
  await(await nft.connect(buyer).approve(await market.getAddress(),0)).wait();
  await(await market.connect(buyer).list(await nft.getAddress(),0,price)).wait();await(await market.connect(buyer).cancel(1)).wait();
  expect(await nft.ownerOf(0)).eq(buyerKey.address);
  const message='RIFT disposable local acceptance: no mainnet authorization';expect(ethers.verifyMessage(message,await buyerKey.signMessage(message))).eq(buyerKey.address);
  await mkdir('checks',{recursive:true});await writeFile('checks/disposable-wallet-result.json',JSON.stringify({scope:'LOCAL SIMULATED CHAIN ONLY',chainId:String(chain.chainId),seller:sellerKey.address,buyer:buyerKey.address,privateKeysSaved:false,realFundsUsed:false,checks:['new random wallets','local balance allocation','message signature recovery','mint','approve','list','reject wrong payment','buy','ownership transfer','full-price seller credit','withdraw','buyer relist','cancel'],notCovered:['mainnet RPC acceptance','mobile wallet UI','independent security audit','all feature combinations']},null,2)+'\n');
 });
});
