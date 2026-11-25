import {expect} from 'chai';
import {network} from 'hardhat';
import {mkdtemp,rm,readdir,readFile} from 'node:fs/promises';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {syncEdgeExchange,edgeExchange} from '../edge/exchange.js';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import express from 'express';
import {ExchangeIndex} from '../server/exchange-index.js';
import {exchangeAPIPlugin} from '../server/exchange-api.js';

const {ethers}=await network.create({network:'default',override:{chainId:25}});
describe('Compiled v2 events -> durable Node index/API — LOCAL ONLY, not hosted acceptance',()=>{
 let seller,buyer,exchange,multi,startBlock,address,temp,path,db;
 beforeEach(async()=>{
  [seller,buyer]=await ethers.getSigners();
  temp=await mkdtemp(join(tmpdir(),'rift-index-acceptance-'));path=join(temp,'orders.sqlite');
  exchange=await ethers.deployContract('RiftExchange',[seller.address]);const receipt=await exchange.deploymentTransaction().wait();startBlock=receipt.blockNumber;address=await exchange.getAddress();
  multi=await ethers.deployContract('Exchange1155');await multi.waitForDeployment();await(await multi.mint(seller.address,1,100)).wait();await(await multi.setApprovalForAll(address,true)).wait();
  db=new ExchangeIndex({path,address,startBlock});
 });
 afterEach(async()=>{db?.close();await rm(temp,{recursive:true,force:true});});
 async function confirmed(){await ethers.provider.send('hardhat_mine',['0xc']);}
 async function catchUp(span=256){
  for(let n=0;n<300;n++){
   const head=Number(BigInt(await ethers.provider.send('eth_blockNumber',[]))),target=head-12;
   if(db.status().indexedThrough>=target)return;
   await db.sync(ethers.provider,{span});
  }
  throw Error('Local backfill exceeded bounded test budget');
 }
 it('projects actual listing fills and funded-offer refunds to matching contract quantities',async()=>{
  await(await exchange.list(await multi.getAddress(),1,10,100,0,ethers.ZeroAddress,true)).wait();
  await(await exchange.connect(buyer).buy(0,3,{value:300})).wait();
  const head=await ethers.provider.getBlock('latest');
  await(await exchange.connect(buyer).makeOffer(await multi.getAddress(),1,25,4,Number(head.timestamp)+3600,0,ethers.ZeroHash,true,{value:100})).wait();
  await(await exchange.acceptOffer(0,1,1,[])).wait();await(await exchange.connect(buyer).closeOffer(0)).wait();
  await confirmed();await catchUp();
  const listing=db.page().items[0],offer=db.page({type:'offer',includeClosed:true}).items[0];
  expect(BigInt(listing.remaining)).eq((await exchange.listings(0)).remaining);expect(BigInt(offer.remaining)).eq((await exchange.offers(0)).remaining);
  expect(listing.remaining).eq('7');expect(offer.remaining).eq('0');expect(await exchange.proceeds(buyer.address)).eq(75n);
  const kinds=db.activity({nft:await multi.getAddress()}).items.map(item=>item.kind);for(const kind of ['Listed','Bought','OfferMade','OfferFilled','OfferClosed'])expect(kinds.includes(kind)).eq(true);
 });
 it('persists restart checkpoints and resumes bounded backfill without duplicating orders',async()=>{
  for(let i=0;i<3;i++)await(await exchange.list(await multi.getAddress(),1,1,100,0,ethers.ZeroAddress,true)).wait();
  await confirmed();await db.sync(ethers.provider,{span:1});const checkpoint=db.status();
  db.close();db=new ExchangeIndex({path,address,startBlock});expect(db.status().indexedThrough).eq(checkpoint.indexedThrough);await catchUp(1);
  const page=db.page({limit:2});expect(page.items.map(item=>item.id)).deep.eq(['2','1']);expect(db.page({cursor:page.nextCursor}).items.map(item=>item.id)).deep.eq(['0']);
  const before=db.status();await db.sync(ethers.provider);expect(db.status()).deep.eq(before);expect(db.db.prepare('SELECT COUNT(*) AS n FROM exchange_orders').get().n).eq(3);
 });
 it('removes a real orphaned fill and replays the replacement branch after restart',async()=>{
  await(await exchange.list(await multi.getAddress(),1,10,100,0,ethers.ZeroAddress,true)).wait();await confirmed();await catchUp();
  const snapshot=await ethers.provider.send('evm_snapshot',[]);
  await(await exchange.connect(buyer).buy(0,3,{value:300})).wait();await confirmed();await catchUp();expect(db.page().items[0].remaining).eq('7');
  db.close();expect(await ethers.provider.send('evm_revert',[snapshot])).eq(true);
  await(await exchange.connect(buyer).buy(0,2,{value:200})).wait();await confirmed();
  db=new ExchangeIndex({path,address,startBlock});await db.sync(ethers.provider);await catchUp();
  expect(db.page().items[0].remaining).eq('8');expect((await exchange.listings(0)).remaining).eq(8n);
  expect(db.activity({nft:await multi.getAddress()}).items.filter(item=>item.kind==='Bought').map(item=>item.quantity)).deep.eq(['2']);
 });
 it('serves durable confirmed orders through the real read-only API and rejects writes',async()=>{
  for(let i=0;i<2;i++)await(await exchange.list(await multi.getAddress(),1,2,100,0,ethers.ZeroAddress,true)).wait();await confirmed();await catchUp();
  const app=express();exchangeAPIPlugin({env:{EXCHANGE_ADDRESS:address,EXCHANGE_START_BLOCK:String(startBlock),EXCHANGE_RUNTIME_HASH:ethers.keccak256(await ethers.provider.getCode(address)),EXCHANGE_INDEX_DB:path}}).configureServer({middlewares:app});
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  try{
   const base='http://127.0.0.1:'+server.address().port+'/api/v1/exchange';
   const capabilities=await(await fetch(base+'/capabilities')).json();expect(capabilities.tradingEnabled).eq(false);
   const page=await(await fetch(base+'/listings?limit=1')).json();expect(page.items[0].id).eq('1');expect(page.nextCursor).eq('1');
   const older=await(await fetch(base+'/listings?cursor='+page.nextCursor)).json();expect(older.items.map(item=>item.id)).deep.eq(['0']);
   expect((await fetch(base+'/listings?account=invalid')).status).eq(400);expect((await fetch(base+'/listings',{method:'POST'})).status).eq(405);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 });
 it('projects the same compiled exchange events into Node SQLite and local D1',async()=>{
  await(await exchange.list(await multi.getAddress(),1,8,100,0,ethers.ZeroAddress,true)).wait();
  await(await exchange.connect(buyer).buy(0,3,{value:300})).wait();await confirmed();await catchUp();
  const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("local")}}',compatibilityDate:'2026-11-01',d1Databases:['DB']}));
  try{
   const d1=await mf.getD1Database('DB');
   for(const file of (await readdir('edge/migrations')).filter(file=>file.endsWith('.sql')).sort())for(const sql of (await readFile('edge/migrations/'+file,'utf8')).split(';').map(sql=>sql.trim()).filter(Boolean))await d1.prepare(sql).run();
   const env={DB:d1,EXCHANGE_ADDRESS:address,EXCHANGE_START_BLOCK:String(startBlock),EXCHANGE_RUNTIME_HASH:ethers.keccak256(await ethers.provider.getCode(address))};
   const target=Number(BigInt(await ethers.provider.send('eth_blockNumber',[])))-12;
   for(let i=0;i<100;i++){
    let headers=0;
    await syncEdgeExchange(env,{rpc:async(method,params)=>{if(method==='eth_getBlockByNumber')headers++;return ethers.provider.send(method,params)}});
    expect(headers<=12).eq(true);
    const state=await d1.prepare('SELECT last_block FROM edge_exchange_state WHERE id=1').first();if(state.last_block>=target)break;
    if(i===99)throw Error('Local D1 backfill exceeded test budget');
   }
   const response=await edgeExchange(new Request('https://rift.example/api/v1/exchange/listings'),env),page=await response.json();
   expect(response.status).eq(200);expect(page.items).deep.eq(db.page().items);expect(page.items[0].remaining).eq('5');
  }finally{await mf.dispose();}
 });

});
