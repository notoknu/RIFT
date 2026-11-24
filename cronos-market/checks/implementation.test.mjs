import test from 'node:test';
import assert from 'node:assert/strict';
import {MarketIndex,MARKET_EVENTS} from '../server/market-index.js';
import {readFavorites,writeFavorites,normalizeTraits} from '../src/persistence.js';
const a='0x1111111111111111111111111111111111111111',b='0x2222222222222222222222222222222222222222';
test('favorites survive reload and malformed storage is isolated',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 assert.equal(writeFavorites([a],storage),true);assert.deepEqual(readFavorites(storage),[a]);
 map.set('rift:favorites:v1','{}');assert.deepEqual(readFavorites(storage),[]);
 assert.deepEqual(normalizeTraits([null,{},'x',{trait_type:'Eyes',value:'Blue'}]),[{trait_type:'Eyes',value:'Blue'}]);
});
test('index supports >100 old orders, repeat sync, cancellation, safe wei and cursor pagination',async()=>{
 const db=new MarketIndex({path:':memory:',address:a,startBlock:10});
 const logs=[];
 for(let id=0;id<131;id++){
  const log=MARKET_EVENTS.encodeEventLog(MARKET_EVENTS.getEvent('Listed'),[id,a,b,2n**200n+BigInt(id),10n**25n]);
  logs.push({...log,transactionHash:'0x'+id.toString(16).padStart(64,'0'),index:0,blockNumber:10+id});
 }
 let head=170;
 const provider={getNetwork:async()=>({chainId:25n}),getBlockNumber:async()=>head,getBlock:async n=>({hash:'block-'+n}),getLogs:async({fromBlock,toBlock})=>logs.filter(l=>l.blockNumber>=fromBlock&&l.blockNumber<=toBlock)};
 try{
  await db.sync(provider);await db.sync(provider);
  let ids=[],cursor;do{const page=db.page({cursor,limit:24});ids.push(...page.items.map(i=>i.id));cursor=page.nextCursor??undefined;if(!cursor)break}while(true);
  assert.equal(ids.length,131);assert.equal(new Set(ids).size,131);assert.ok(ids.includes('0'));
  const event=MARKET_EVENTS.encodeEventLog(MARKET_EVENTS.getEvent('Cancelled'),[0]);
  logs.push({...event,transactionHash:'0x'+'f'.repeat(64),index:0,blockNumber:160});head=180;
  await db.sync(provider);let total=0;cursor=undefined;do{let page=db.page({cursor});total+=page.items.length;cursor=page.nextCursor??undefined;if(!cursor)break}while(true);assert.equal(total,130);
  assert.equal(db.page().items[0].priceWei,(10n**25n).toString());
  assert.throws(()=>db.page({cursor:'-1'}));assert.throws(()=>db.page({limit:1000}));
  await assert.rejects(db.sync({...provider,getNetwork:async()=>({chainId:1n})}),/Wrong RPC/);
  await assert.rejects(db.sync({...provider,getBlock:async()=>({hash:'fork'})}),/reorg/);
 }finally{db.close()}
});

import {assertFreshPreflight} from '../scripts/preflight-validation.js';
import {validateMetadataDirectory,estimateIPFS} from '../src/ipfs-preflight.js';
import {ByteCache} from '../server/byte-cache.js';
test('invalid, stale and future preflight timestamps fail closed',()=>{
 const now=Date.now(),hash='reviewed',admin=a,base={timestamp:new Date(now).toISOString(),chainId:25,bytecodeHash:hash,admin};
 assertFreshPreflight(base,{hash,admin,now});
 for(const timestamp of ['bad',null,new Date(now+120000).toISOString(),new Date(now-86400001).toISOString()])assert.throws(()=>assertFreshPreflight({...base,timestamp},{hash,admin,now}));
 assert.throws(()=>assertFreshPreflight({...base,chainId:1},{hash,admin,now}));
});
test('metadata local preflight requires consecutive token files and genuine IPFS art',async()=>{
 const uri='ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3pteuja4j4wzrflz7me3lxb4i/a.png';
 const file=(name,data)=>({name,size:JSON.stringify(data).length,text:async()=>JSON.stringify(data)});
 const files=[file('1.json',{name:'Art #1',image:uri,attributes:[]}),file('contract.json',{name:'Art',image:uri})];
 assert.equal((await validateMetadataDirectory(files,1)).files,2);
 await assert.rejects(validateMetadataDirectory([file('0.json',{name:'Art',image:uri}),files[1]],1),/filename/);
 await assert.rejects(validateMetadataDirectory([file('1.json',{name:'Art',image:'https://example.com/a.png'}),files[1]],1),/ipfs/);
 await assert.rejects(validateMetadataDirectory(files,2),/exactly/);
 assert.equal(estimateIPFS({count:1000,imageBytes:1000}).within500LogicalFiles,false);
});
test('cache bounds aggregate bytes and ignores invalid accounting',()=>{
 const cache=new ByteCache({maxBytes:10,maxEntries:3});cache.set('a','a',{size:7});cache.set('b','b',{size:7});assert.equal(cache.get('a'),undefined);assert.equal(cache.bytes,7);cache.set('bad','x',{size:NaN});assert.equal(cache.bytes,7);
});

import {ipfsAPIPlugin} from '../server/ipfs-api.js';
test('public IPFS verifier bounds each page and never accepts HTTPS token storage',async()=>{
 let handler,urls=[];ipfsAPIPlugin({fetcher:async url=>{urls.push(url);return {bytes:Buffer.from(JSON.stringify({name:'Test-only metadata response',image:'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3pteuja4j4wzrflz7me3lxb4i/art.png'}))}}}).configureServer({middlewares:{use:(path,fn)=>handler=fn}});
 const response=()=>({statusCode:200,setHeader(){},end(data){this.body=JSON.parse(data)}});
 const dir='ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3pteuja4j4wzrflz7me3lxb4i/';
 const res=response();await handler({method:'GET',url:'/?'+new URLSearchParams({directory:dir,supply:'20'})},res);
 assert.equal(res.statusCode,200);assert.equal(res.body.items.length,8);assert.equal(res.body.nextStart,9);assert.equal(urls.length,9);assert.ok(urls.every(u=>u.startsWith('https://ipfs.io/ipfs/')));
 const invalid=response();await handler({method:'GET',url:'/?'+new URLSearchParams({directory:'https://example.com/',supply:'1'})},invalid);assert.equal(invalid.statusCode,400);
});
