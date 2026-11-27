import {stableD1ProjectionRead} from './projection-read-consistency.js';
import {normalizeProjectionQuery,projectionReadHttpStatus} from '../shared/projection-read-contract.js';
import {checkpointStatements,recoverLegacyFork,beginEdgeReceipts,stepEdgeReceipts} from './market-recovery.js';
import {stageDenseMarket} from './dense-market.js';
import{boundedBytes}from'../shared/creator-service.js';
import {Interface,isAddress,formatEther} from 'ethers';
const events=new Interface(['event Listed(uint256 indexed id,address indexed seller,address indexed nft,uint256 tokenId,uint256 price)','event Purchased(uint256 indexed id,address indexed buyer)','event Cancelled(uint256 indexed id)']);
const orderKey=id=>BigInt(id).toString().padStart(78,'0');
export async function edgeRPC(env,method,params){
 const minute=Math.floor(Date.now()/60000),limit=await env.DB.prepare('INSERT INTO edge_rpc_budget(period,count) VALUES(?,1) ON CONFLICT(period) DO UPDATE SET count=count+1 WHERE count<120 RETURNING count').bind(minute).first();if(!limit)throw Error('Shared RPC budget exhausted');
 const response=await fetch('https://evm.cronos.org',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('RPC unavailable');
 const data=JSON.parse(new TextDecoder().decode(await boundedBytes(response,method==='eth_getTransactionReceipt'?1048576:method==='eth_getBlockByNumber'?1800000:262144)));if(data.error)throw Error('RPC rejected request');return data.result;
}
export async function edgeListings(db,url,{address,startBlock}={}){
 const send=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}}),detail=url.pathname.match(/^\/api\/v1\/listings\/(\d{1,78})$/);
 if(!detail&&url.pathname!=='/api/v1/listings')return send({error:'Unknown listing route'},404);
 if(!isAddress(address||'')||/^0x0{40}$/i.test(address)||!/^\d+$/.test(String(startBlock??''))||!Number.isSafeInteger(Number(startBlock)))return send({error:'Marketplace index not configured'},503);
 let q;try{q=normalizeProjectionQuery('legacy-market',detail?'get':'page',detail?detail[1]:{cursor:url.searchParams.get('cursor')??undefined,seller:url.searchParams.get('seller')||undefined,nft:url.searchParams.get('nft')||undefined,limit:url.searchParams.has('limit')?Number(url.searchParams.get('limit')):24})}catch(e){return send({error:'Invalid listing query'},projectionReadHttpStatus(e))}
 return stableD1ProjectionRead(db,{sql:'SELECT * FROM edge_market_state WHERE id=1'},async(session,s)=>{
  if(!s||s.address!==address.toLowerCase()||s.start_block!==Number(startBlock))return send({error:'Edge market not configured/indexed'},503);
  const coverage={chainId:25,address:s.address,startBlock:s.start_block,indexedThrough:s.last_block,blockHash:s.block_hash,observedHead:s.head,updatedAt:s.updated?new Date(s.updated).toISOString():null,lastError:s.error?'Index reports an error; inspect operator logs':null,scope:'RIFT marketplace events only; 12-confirmation lag; not live settlement authority or whole-network sales'};
  const item=r=>({id:BigInt(r.id).toString(),seller:r.seller,nft:r.nft,tokenId:r.token_id,priceWei:r.price_wei,price:formatEther(r.price_wei)});
  if(detail){const row=await session.prepare('SELECT * FROM edge_market_orders WHERE id=?').bind(orderKey(q)).first();return send({item:row?{...item(row),active:!!row.active}:null,coverage},row?200:404)}
  const conditions=['active=1'],args=[];if(q.cursor!==undefined){conditions.push('id<?');args.push(orderKey(q.cursor))}if(q.seller){conditions.push('seller=?');args.push(q.seller.toLowerCase())}if(q.nft){conditions.push('nft=?');args.push(q.nft.toLowerCase())}
  const rows=(await session.prepare('SELECT * FROM edge_market_orders WHERE '+conditions.join(' AND ')+' ORDER BY id DESC LIMIT ?').bind(...args,q.limit+1).all()).results,items=rows.slice(0,q.limit).map(item);return send({items,nextCursor:rows.length>q.limit?items.at(-1).id:null,coverage});
 });
}
export async function syncEdgeMarket(env,{rpc=(method,params)=>edgeRPC(env,method,params),now=()=>Date.now()}={}){
 if(!isAddress(env.MARKETPLACE_ADDRESS)||!/^\d+$/.test(env.MARKET_START_BLOCK||''))return {disabled:true};
 const start=Number(env.MARKET_START_BLOCK),address=env.MARKETPLACE_ADDRESS.toLowerCase();if(!Number.isSafeInteger(start)||start<0)throw Error('Invalid market deployment block');
 await env.DB.prepare('INSERT OR IGNORE INTO edge_market_state(id,address,start_block,last_block,span) VALUES(1,?,?,?,128)').bind(address,start,start-1).run();
 const cfg=await env.DB.prepare('SELECT * FROM edge_market_state WHERE id=1').first();if(cfg.address!==address||cfg.start_block!==start)throw Error('Market binding mismatch; operator migration required');
 const lease=crypto.randomUUID(),lock=await env.DB.prepare('UPDATE edge_market_state SET lease=?,lease_until=? WHERE id=1 AND (lease_until IS NULL OR lease_until<?) RETURNING id').bind(lease,now()+120000,now()).first();if(!lock)return {busy:true};
 try{
  if(await rpc('eth_chainId',[])!=='0x19')throw Error('Wrong RPC chain');
  const head=Number(BigInt(await rpc('eth_blockNumber',[]))),target=head-12;
  if(target<cfg.last_block)throw Error('RPC head regressed');
  if(cfg.last_block>=start){const block=await rpc('eth_getBlockByNumber',['0x'+cfg.last_block.toString(16),false]);if(!block||block.hash!==cfg.block_hash)return await recoverLegacyFork(env,{cfg,rpc,lease,now});}
  const receiptScan=await env.DB.prepare('SELECT * FROM edge_market_receipt_scan WHERE id=1').first();
  if(receiptScan){if(target<receiptScan.block)return {waitingConfirmations:true};if(receiptScan.block!==cfg.last_block+1)throw Error('Receipt checkpoint mismatch');return await stepEdgeReceipts(env,{scan:receiptScan,rpc,address,topics:['Listed','Purchased','Cancelled'].map(n=>events.getEvent(n).topicHash),lease,now,head,previous:cfg.last_block,decode(log,b,hash){
   const index=Number(BigInt(log.logIndex));if(log.removed||log.address?.toLowerCase()!==address||Number(BigInt(log.blockNumber))!==b||log.blockHash!==hash||!Number.isSafeInteger(index)||index<0)throw Error('Invalid receipt market log');const parsed=events.parseLog(log);return {tx:log.transactionHash,index,id:orderKey(parsed.args.id),kind:parsed.name,payload:parsed.name==='Listed'?JSON.stringify({seller:parsed.args.seller.toLowerCase(),nft:parsed.args.nft.toLowerCase(),tokenId:parsed.args.tokenId.toString(),priceWei:parsed.args.price.toString()}):'{}'};
  }})}
  const pending=await env.DB.prepare('SELECT * FROM edge_market_pending WHERE id=1').first();
  if(pending){
   if(target<pending.block)return {waitingConfirmations:true};
   if(pending.block!==cfg.last_block+1)throw Error('Dense block checkpoint mismatch');
   const canonical=await rpc('eth_getBlockByNumber',['0x'+pending.block.toString(16),false]);
   if(canonical?.hash!==pending.block_hash){
    await env.DB.batch([env.DB.prepare('DELETE FROM edge_market_events WHERE block=? AND EXISTS(SELECT 1 FROM edge_market_state WHERE id=1 AND lease=?)').bind(pending.block,lease),env.DB.prepare('DELETE FROM edge_market_pending WHERE id=1 AND EXISTS(SELECT 1 FROM edge_market_state WHERE id=1 AND lease=?)').bind(lease)]);
    throw Error('Uncommitted dense block changed; staged events discarded safely');
   }
   return await stageDenseMarket(env,{pending,lease,now,head,previous:cfg.last_block});
  }
  if(target<start||target===cfg.last_block)return {idle:true};
  const from=cfg.last_block+1,to=Math.min(target,from+cfg.span-1),hex=n=>'0x'+n.toString(16),block=await rpc('eth_getBlockByNumber',[hex(to),false]);if(!block?.hash)throw Error('Missing checkpoint block');
  let logs;try{logs=await rpc('eth_getLogs',[{address,fromBlock:hex(from),toBlock:hex(to),topics:[['Listed','Purchased','Cancelled'].map(n=>events.getEvent(n).topicHash)]}])}catch(error){
   if(from===to)return await beginEdgeReceipts(env,{rpc,block:from,lease,now});
   await env.DB.prepare('UPDATE edge_market_state SET span=MAX(1,span/2) WHERE id=1 AND lease=?').bind(lease).run();throw Error('Log range failed; span reduced.');
  }
  if(!Array.isArray(logs))throw Error('Invalid logs response');
  if(logs.length>12){
   if(from!==to){await env.DB.prepare('UPDATE edge_market_state SET span=MAX(1,span/2) WHERE id=1 AND lease=?').bind(lease).run();throw Error('Log batch exceeds 12 events; span reduced.');}
   if(logs.length>1000)return await beginEdgeReceipts(env,{rpc,block:from,lease,now});
   if((await rpc('eth_getBlockByNumber',[hex(to),false]))?.hash!==block.hash)throw Error('Chain changed during dense fetch');
   const seen=new Set(),rows=logs.map(log=>{
    const b=Number(BigInt(log.blockNumber)),index=Number(BigInt(log.logIndex));
    if(log.removed||b!==from||log.blockHash!==block.hash||log.address.toLowerCase()!==address||!Number.isSafeInteger(index)||index<0||seen.has(index))throw Error('Invalid dense market log');seen.add(index);
    const parsed=events.parseLog(log),id=orderKey(parsed.args.id),payload=parsed.name==='Listed'?JSON.stringify({seller:parsed.args.seller.toLowerCase(),nft:parsed.args.nft.toLowerCase(),tokenId:parsed.args.tokenId.toString(),priceWei:parsed.args.price.toString()}):'{}';return {tx:log.transactionHash,index,id,kind:parsed.name,payload};
   }).sort((a,b)=>a.index-b.index);
   const inserted=await env.DB.prepare('INSERT INTO edge_market_pending SELECT 1,?,?,?,0 WHERE EXISTS(SELECT 1 FROM edge_market_state WHERE id=1 AND lease=? AND lease_until>?) RETURNING id').bind(from,block.hash,JSON.stringify(rows),lease,now()).first();if(!inserted)throw Error('Dense staging lease lost');
   return await stageDenseMarket(env,{pending:{block:from,block_hash:block.hash,events:JSON.stringify(rows),offset:0},lease,now,head,previous:cfg.last_block});
  }
  const checkpoint=await rpc('eth_getBlockByNumber',[hex(to),false]);if(checkpoint?.hash!==block.hash)throw Error('Chain changed during fetch');
  const statements=[];const guard='EXISTS(SELECT 1 FROM edge_market_state WHERE id=1 AND lease=? AND lease_until>?)';
  for(const log of logs.sort((a,b)=>Number(BigInt(a.blockNumber)-BigInt(b.blockNumber))||Number(BigInt(a.logIndex)-BigInt(b.logIndex)))){
   const b=Number(BigInt(log.blockNumber));if(log.removed||b<from||b>to||log.address.toLowerCase()!==address)throw Error('Invalid market log');
   const parsed=events.parseLog(log),id=orderKey(parsed.args.id),payload=parsed.name==='Listed'?JSON.stringify({seller:parsed.args.seller.toLowerCase(),nft:parsed.args.nft.toLowerCase(),tokenId:parsed.args.tokenId.toString(),priceWei:parsed.args.price.toString()}):'{}';
   statements.push(env.DB.prepare('INSERT OR IGNORE INTO edge_market_events SELECT ?,?,?,?,?,?,? WHERE '+guard).bind(log.transactionHash,Number(BigInt(log.logIndex)),b,log.blockHash,id,parsed.name,payload,lease,now()));
   if(parsed.name==='Listed'){
    const d=JSON.parse(payload);statements.push(env.DB.prepare('INSERT OR REPLACE INTO edge_market_orders SELECT ?,?,?,?,?,1 WHERE '+guard).bind(id,d.seller,d.nft,d.tokenId,d.priceWei,lease,now()));
   }else statements.push(env.DB.prepare('UPDATE edge_market_orders SET active=0 WHERE id=? AND '+guard).bind(id,lease,now()));
  }
  statements.push(...await checkpointStatements(env.DB,to,block.hash,lease,now));
  statements.push(env.DB.prepare('UPDATE edge_market_state SET last_block=?,block_hash=?,updated=?,head=?,error=NULL,span=MIN(128,span*2) WHERE id=1 AND lease=? AND lease_until>? AND last_block=?').bind(to,block.hash,now(),head,lease,now(),cfg.last_block));
  const result=await env.DB.batch(statements);if(result.at(-1).meta.changes!==1)throw Error('Index lease lost before commit');return {from,to,events:logs.length};
 }catch(error){await env.DB.prepare('UPDATE edge_market_state SET error=? WHERE id=1 AND lease=?').bind(error.message.slice(0,300),lease).run();throw error}
 finally{await env.DB.prepare('UPDATE edge_market_state SET lease=NULL,lease_until=NULL WHERE id=1 AND lease=?').bind(lease).run()}
}
