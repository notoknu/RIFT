import {expect} from 'chai';
import {network} from 'hardhat';
import assert from 'node:assert/strict';
import {prepareMintReview,confirmMintReview} from '../src/mint-review.js';
import {trackedTransaction,readTransactions} from '../src/transactions.js';
import {loadDropSnapshot} from '../src/drop-snapshot.js';
import {createAllowlist} from '../src/allowlist.js';

// Isolated EDR chain with chainId25. No HTTP provider or mainnet connection.
const {ethers}=await network.create({network:'default',override:{chainId:25}});
describe('Mint review against compiled RiftDrop — LOCAL SIMULATION ONLY',()=>{
 let owner,buyer,other,config;
 beforeEach(async()=>{
  [owner,buyer,other]=await ethers.getSigners();
  config={name:'Local Review',symbol:'LOCAL',supply:5,walletLimit:3,txLimit:2,price:0,start:0,end:0,allowlistEnd:0,root:ethers.ZeroHash,mode:0,content:'',creator:owner.address,royaltyBps:500,description:'Local acceptance fixture',collectionImage:'',collectionBanner:'',externalUrl:''};
 });
 async function deploy(changes={}){const drop=await ethers.deployContract('RiftDrop',[{...config,...changes}]);await drop.waitForDeployment();return drop;}
 async function review(drop,changes={}){
  return prepareMintReview({signer:buyer,address:await drop.getAddress(),abi:JSON.parse(drop.interface.formatJson()),quantity:'1',proof:[],...changes});
 }
 it('reviews, confirms, tracks and mints on-chain SVG with an actual successful receipt',async()=>{
  const drop=await deploy(),r=await review(drop);
  expect(await drop.totalMinted()).eq(0n);await confirmMintReview(r,()=>true);
  const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
  const receipt=await trackedTransaction('Local test mint',buyer,()=>r.contract.mint(...r.args),{drop:await drop.getAddress()},storage);
  expect(receipt.status).eq(1);expect(await drop.ownerOf(1)).eq(buyer.address);expect(await drop.mintedBy(buyer.address)).eq(1n);expect(readTransactions(storage)[0].status).eq('confirmed');
  const token=JSON.parse(Buffer.from((await drop.tokenURI(1)).split(',')[1],'base64').toString());expect(token.image.startsWith('data:image/svg+xml;base64,')).eq(true);
 });
 it('uses exact actual paid-mint value, not a cached displayed price',async()=>{
  const drop=await deploy({price:ethers.parseEther('0.01')}),r=await review(drop,{quantity:'2'});
  expect(r.value).eq(ethers.parseEther('0.02'));await confirmMintReview(r,()=>true);await(await r.contract.mint(...r.args)).wait();expect(await ethers.provider.getBalance(await drop.getAddress())).eq(r.value);expect(await drop.totalMinted()).eq(2n);
 });
 it('rejects an unauthorized allowlist wallet and accepts generated valid proofs',async()=>{
  const pack=createAllowlist([owner.address,buyer.address].join('\n'));
  const head=await ethers.provider.getBlock('latest');const drop=await deploy({root:pack.root,allowlistEnd:Number(head.timestamp)+3600});
  await assert.rejects(review(drop,{signer:other}));
  const r=await review(drop,{proof:pack.claims[buyer.address.toLowerCase()]});await confirmMintReview(r,()=>true);await(await r.contract.mint(...r.args)).wait();expect(await drop.ownerOf(1)).eq(buyer.address);
 });
 it('detects pause after first simulation, before requesting a mint',async()=>{
  const drop=await deploy(),r=await review(drop);await(await drop.pause()).wait();await assert.rejects(confirmMintReview(r,()=>true));expect(await drop.totalMinted()).eq(0n);
 });
 it('declined review does not consume a buyer transaction nonce',async()=>{
  const drop=await deploy(),r=await review(drop),before=await ethers.provider.getTransactionCount(buyer.address);await assert.rejects(confirmMintReview(r,()=>false),/declined/);expect(await ethers.provider.getTransactionCount(buyer.address)).eq(before);expect(await drop.totalMinted()).eq(0n);
 });
 it('reads a fixed-block snapshot from the actual compiled drop and refreshes after mint',async()=>{
  const drop=await deploy(),options={address:await drop.getAddress(),abi:JSON.parse(drop.interface.formatJson()),endpoints:['isolated-edr'],createRpc:()=>({request:({method,params=[]})=>ethers.provider.send(method,params),pause(){}})};
  const before=await loadDropSnapshot(options);expect(before.values.totalMinted).eq(0n);
  await(await drop.connect(buyer).mint(1,[])).wait();const after=await loadDropSnapshot(options);expect(after.values.totalMinted).eq(1n);expect(BigInt(after.observation.blockNumber)>BigInt(before.observation.blockNumber)).eq(true);
 });
});
