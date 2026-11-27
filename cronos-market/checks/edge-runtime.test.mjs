import{syncEdgeMarket,edgeListings}from'../edge/market-sync.js';import{Interface}from'ethers';
import test from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';import {Miniflare,convertV4MiniflareOptions} from 'miniflare';import {build} from 'esbuild';import {Wallet} from 'ethers';
test('creator API executes in workerd with real local D1 bindings',async()=>{
 const bundle=await build({entryPoints:['edge/worker.js'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-11-01',d1Databases:['DB'],bindings:{PUBLIC_ORIGIN:'https://rift.example'}}));
 try{
  const db=await mf.getD1Database('DB'),sql=(await Promise.all((await readdir('edge/migrations')).filter(f=>f.endsWith('.sql')).sort().map(f=>readFile('edge/migrations/'+f,'utf8')))).join('\n');
  for(const statement of sql.split(';').map(v=>v.trim()).filter(Boolean))await db.prepare(statement).run();
  const wallet=Wallet.createRandom();const send=(path,method='GET',data,cookie,origin='https://rift.example')=>mf.dispatchFetch('https://rift.example/api/v1'+path,{method,headers:{Origin:origin,...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});
  const invalid=await send('/auth/nonce','POST',{address:wallet.address},undefined,'https://evil.example');assert.equal(invalid.status,403);
  const challenge=await(await send('/auth/nonce','POST',{address:wallet.address})).json();assert.ok(challenge.nonce);
  const verification=await send('/auth/verify','POST',{nonce:challenge.nonce,signature:await wallet.signMessage(challenge.message)});assert.equal(verification.status,200);
  const cookie=verification.headers.get('set-cookie').split(';')[0],created=await send('/launch-drafts','POST',{mode:0,config:{name:'Isolated runtime test'}},cookie);assert.equal(created.status,201);
  const result=await created.json(),saved=await(await send('/launch-drafts/'+result.id,'GET',undefined,cookie)).json();assert.equal(saved.document.config.name,'Isolated runtime test');
  assert.equal((await send('/auth/verify','POST',{nonce:challenge.nonce,signature:await wallet.signMessage(challenge.message)})).status,401);
  assert.equal((await send('/storage/capabilities')).status,200);assert.equal((await send('/uploads','POST',{bytes:10,files:1},cookie)).status,503);
  assert.equal((await send('/favorites','PUT',{addresses:[wallet.address]},cookie)).status,200);assert.equal((await(await send('/favorites','GET',undefined,cookie)).json()).addresses.length,1);
  const plan=await db.prepare('SELECT COUNT(*) n FROM creator_drafts').first();assert.equal(plan.n,1);
  const market='0x1111111111111111111111111111111111111111',nft='0x2222222222222222222222222222222222222222',abi=new Interface(['event Listed(uint256 indexed id,address indexed seller,address indexed nft,uint256 tokenId,uint256 price)','event Purchased(uint256 indexed id,address indexed buyer)','event Cancelled(uint256 indexed id)']);
  let head=200;const logs=[];
  for(let id=0;id<131;id++){const e=abi.encodeEventLog(abi.getEvent('Listed'),[id,market,nft,2n**200n+BigInt(id),10n**25n]);logs.push({...e,address:market,blockNumber:'0x'+(10+id).toString(16),blockHash:'hash-'+(10+id),transactionHash:'0x'+id.toString(16).padStart(64,'0'),logIndex:'0x0'})}
  const rpc=async(method,args)=>{if(method==='eth_chainId')return '0x19';if(method==='eth_blockNumber')return '0x'+head.toString(16);if(method==='eth_getBlockByNumber')return {hash:'hash-'+Number(BigInt(args[0]))};if(method==='eth_getLogs'){const filter=args[0];return logs.filter(l=>BigInt(l.blockNumber)>=BigInt(filter.fromBlock)&&BigInt(l.blockNumber)<=BigInt(filter.toBlock)).reverse()}throw Error('Unexpected RPC')};
  const env={DB:db,MARKETPLACE_ADDRESS:market,MARKET_START_BLOCK:'10'};let tries=0;
  while((await db.prepare('SELECT last_block FROM edge_market_state WHERE id=1').first())?.last_block!==188&&tries++<50){try{await syncEdgeMarket(env,{rpc})}catch(e){if(!e.message.includes('span reduced'))throw e}}
  assert.ok(tries<50);let cursor='',ids=[];
  do{const r=await edgeListings(db,new URL('https://rift.example/api/v1/listings?'+new URLSearchParams({limit:'24',...(cursor?{cursor}:{})})),{address:market,startBlock:10}),page=await r.json();ids.push(...page.items.map(r=>r.id));cursor=page.nextCursor}while(cursor);
  assert.equal(ids.length,131);assert.equal(new Set(ids).size,131);assert.ok(ids.includes('0'));
  const sold=abi.encodeEventLog(abi.getEvent('Purchased'),[0,wallet.address]);logs.push({...sold,address:market,blockNumber:'0xbe',blockHash:'hash-190',transactionHash:'0x'+'f'.repeat(64),logIndex:'0x0'});head=220;
  for(let i=0;i<5;i++)await syncEdgeMarket(env,{rpc});assert.equal((await db.prepare('SELECT active FROM edge_market_orders WHERE id=?').bind('0'.padStart(78,'0')).first()).active,0);
  const before=(await db.prepare('SELECT last_block FROM edge_market_state WHERE id=1').first()).last_block;
  const recovery=await syncEdgeMarket(env,{rpc:async(m,a)=>m==='eth_getBlockByNumber'&&Number(BigInt(a[0]))===before?{hash:'fork'}:rpc(m,a)});assert.equal(recovery.reorgRecovered,true);assert.ok((await db.prepare('SELECT last_block FROM edge_market_state WHERE id=1').first()).last_block<before);
  // Reset isolated test DB; 55 events in one block must not expose partial orders.
  await db.batch(['DELETE FROM edge_market_events','DELETE FROM edge_market_orders','DELETE FROM edge_market_state','DELETE FROM edge_market_checkpoints'].map(s=>db.prepare(s)));
  logs.length=0;head=22;
  for(let id=0;id<55;id++){const e=abi.encodeEventLog(abi.getEvent('Listed'),[id,market,nft,id,100]);logs.push({...e,address:market,blockNumber:'0xa',blockHash:'hash-10',transactionHash:'0x'+id.toString(16).padStart(64,'0'),logIndex:'0x'+id.toString(16)})}
  let staged=await syncEdgeMarket(env,{rpc});assert.equal(staged.staging,true);assert.equal((await db.prepare('SELECT COUNT(*) n FROM edge_market_orders').first()).n,0);assert.equal((await db.prepare('SELECT last_block FROM edge_market_state WHERE id=1').first()).last_block,9);
  staged=await syncEdgeMarket(env,{rpc});assert.equal(staged.staging,true);assert.equal((await db.prepare('SELECT COUNT(*) n FROM edge_market_orders').first()).n,0);
  staged=await syncEdgeMarket(env,{rpc});assert.equal(staged.staging,false);assert.equal((await db.prepare('SELECT COUNT(*) n FROM edge_market_orders').first()).n,55);assert.equal((await db.prepare('SELECT last_block FROM edge_market_state WHERE id=1').first()).last_block,10);
  assert.equal(await db.prepare('SELECT * FROM edge_market_pending').first(),null);
  // Uncommitted fork cleanup leaves the visible checkpoint/orders untouched.
  head=23;logs.length=0;for(let id=0;id<21;id++){const e=abi.encodeEventLog(abi.getEvent('Purchased'),[id,market]);logs.push({...e,address:market,blockNumber:'0xb',blockHash:'hash-11',transactionHash:'0x'+(id+100).toString(16).padStart(64,'0'),logIndex:'0x'+id.toString(16)})}
  await syncEdgeMarket(env,{rpc});await assert.rejects(syncEdgeMarket(env,{rpc:async(m,a)=>m==='eth_getBlockByNumber'&&a[0]==='0xb'?{hash:'fork-11'}:rpc(m,a)}),/discarded safely/);
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM edge_market_orders WHERE active=1').first()).n,55);assert.equal((await db.prepare('SELECT COUNT(*) n FROM edge_market_events WHERE block=11').first()).n,0);
  // An RPC result-too-large response must trigger resumable receipt discovery.
  await db.batch(['edge_market_events','edge_market_orders','edge_market_state','edge_market_checkpoints','edge_market_pending','edge_market_receipt_scan','edge_market_receipt_queue'].map(t=>db.prepare('DELETE FROM '+t)));
  const canonicalHash='0x'+'a'.repeat(64),receiptTx='0x'+'b'.repeat(64),receiptLogs=[];
  for(let id=0;id<55;id++){const e=abi.encodeEventLog(abi.getEvent('Listed'),[id,market,nft,id,100]);receiptLogs.push({...e,address:market,blockNumber:'0xa',blockHash:canonicalHash,transactionHash:receiptTx,transactionIndex:'0x0',logIndex:'0x'+id.toString(16)})}
  const receiptRPC=async(method,args)=>{if(method==='eth_chainId')return '0x19';if(method==='eth_blockNumber')return '0x16';if(method==='eth_getBlockByNumber')return {number:'0xa',hash:canonicalHash,transactions:[receiptTx]};if(method==='eth_getLogs')throw Error('Response too large');if(method==='eth_getTransactionReceipt')return {transactionHash:receiptTx,status:'0x1',transactionIndex:'0x0',blockNumber:'0xa',blockHash:canonicalHash,logs:receiptLogs};throw Error('Unexpected receipt RPC')};
  assert.equal((await syncEdgeMarket(env,{rpc:receiptRPC})).receiptBackfill,true);
  for(let step=0;step<3;step++){const progress=await syncEdgeMarket(env,{rpc:receiptRPC});assert.equal(progress.receiptBackfill,true);assert.equal((await db.prepare('SELECT COUNT(*) n FROM edge_market_orders').first()).n,0)}
  const published=await syncEdgeMarket(env,{rpc:receiptRPC});assert.equal(published.receiptBackfill,false);assert.equal((await db.prepare('SELECT COUNT(*) n FROM edge_market_orders').first()).n,55);assert.equal((await db.prepare('SELECT last_block FROM edge_market_state').first()).last_block,10);
  console.log('Actual local workerd + D1 checks passed; hosted Free-plan CPU limits are not established by local emulation.');
 }finally{await mf.dispose()}
});
