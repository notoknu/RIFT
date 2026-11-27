import {verifyCollectionPublication} from './collection-publication-gate.js';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {Interface,isAddress,formatEther} from 'ethers';
export const MARKET_EVENTS=new Interface([
 'event Listed(uint256 indexed id,address indexed seller,address indexed nft,uint256 tokenId,uint256 price)',
 'event Purchased(uint256 indexed id,address indexed buyer)',
 'event Cancelled(uint256 indexed id)'
]);
const key=id=>{const s=String(id);if(!/^\d{1,78}$/.test(s)||BigInt(s)>=2n**256n)throw Error('Invalid listing ID/cursor');return BigInt(s).toString().padStart(78,'0')};
export class MarketIndex {
 constructor({path='data/market-index.sqlite',address,startBlock,chainId=25}){
  if(chainId!==25||!isAddress(address)||!Number.isSafeInteger(startBlock)||startBlock<0)throw Error('Explicit Cronos market address and deployment block required');
  mkdirSync(dirname(path),{recursive:true});this.address=address.toLowerCase();this.startBlock=startBlock;
  this.db=new DatabaseSync(path);this.db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;
   CREATE TABLE IF NOT EXISTS config (id INTEGER PRIMARY KEY CHECK(id=1),address TEXT,start_block INTEGER,last_block INTEGER,block_hash TEXT,updated_at INTEGER);
   CREATE TABLE IF NOT EXISTS events (tx TEXT,log_index INTEGER,block INTEGER,id TEXT,kind TEXT,payload TEXT,PRIMARY KEY(tx,log_index));
   CREATE INDEX IF NOT EXISTS event_ids ON events(id,block,log_index);
   CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY,seller TEXT,nft TEXT,token_id TEXT,price_wei TEXT,active INTEGER);
   CREATE INDEX IF NOT EXISTS order_active ON orders(active,id);
   CREATE INDEX IF NOT EXISTS order_seller ON orders(seller,active,id);`);
  const cfg=this.db.prepare('SELECT * FROM config WHERE id=1').get();
  if(cfg&&(cfg.address!==this.address||cfg.start_block!==startBlock)){this.db.close();throw Error('Market database configuration mismatch; choose a new database');}
  if(!cfg)this.db.prepare('INSERT INTO config VALUES(1,?,?,?,NULL,NULL)').run(this.address,startBlock,startBlock-1);
 }
 close(){this.db.close()}
 status(){const r=this.db.prepare('SELECT * FROM config WHERE id=1').get();return {chainId:25,address:r.address,startBlock:r.start_block,indexedThrough:r.last_block,blockHash:r.block_hash,updatedAt:r.updated_at?new Date(r.updated_at).toISOString():null,scope:'RIFT marketplace events only; finalized historical projection, not live settlement authority'};}
 page({cursor,seller,nft,limit=24}={}){
  if(!Number.isInteger(limit)||limit<1||limit>48)throw Error('Limit must be 1–48');
  if(cursor!==undefined&&!/^\d{1,78}$/.test(cursor))throw Error('Invalid cursor');
  if(seller&&!isAddress(seller))throw Error('Invalid seller');if(nft&&!isAddress(nft))throw Error('Invalid NFT contract');
  let clauses=['active=1'],args=[];
  if(cursor!==undefined){clauses.push('id<?');args.push(key(cursor))}
  if(seller){clauses.push('seller=?');args.push(seller.toLowerCase())}if(nft){clauses.push('nft=?');args.push(nft.toLowerCase())}
  let result=this.db.prepare('SELECT * FROM orders WHERE '+clauses.join(' AND ')+' ORDER BY id DESC LIMIT ?').all(...args,limit+1),more=result.length>limit;
  const items=result.slice(0,limit).map(r=>({id:BigInt(r.id).toString(),seller:r.seller,nft:r.nft,tokenId:r.token_id,priceWei:r.price_wei,price:formatEther(r.price_wei)}));
  return {items,nextCursor:more?items.at(-1).id:null,coverage:this.status()};
 }
 get(id){const r=this.db.prepare('SELECT * FROM orders WHERE id=?').get(key(id));return {item:r?{id:BigInt(r.id).toString(),seller:r.seller,nft:r.nft,tokenId:r.token_id,priceWei:r.price_wei,price:formatEther(r.price_wei),active:!!r.active}:null,coverage:this.status()}}
 async sync(provider,{span=1000,confirmations=12,replay=64,throughBlock,chainReader,eventReader,signal,agreementTimeoutMs=15000}={}){
  if(throughBlock!==undefined&&(!Number.isSafeInteger(throughBlock)||throughBlock<this.startBlock))throw Error('Invalid fixed index target');
  const independent=chainReader!==undefined||eventReader!==undefined;if(independent&&(!chainReader||!eventReader||span>32))throw Error('Invalid market agreement configuration');if(signal?.aborted)throw Error('Market sync cancelled');
  if(!Number.isInteger(span)||span<1||span>2000||!Number.isInteger(confirmations)||confirmations<1||!Number.isInteger(replay)||replay<1||replay>=span)throw Error('Invalid bounded index settings');
  if(Number((await provider.getNetwork()).chainId)!==25)throw Error('Wrong RPC chain');
  const cfg=this.db.prepare('SELECT * FROM config WHERE id=1').get(),head=await provider.getBlockNumber(),target=Math.min(head-confirmations,throughBlock??Number.MAX_SAFE_INTEGER);
  if(target<this.startBlock)return this.status();
  // Prove the last checkpoint still belongs to the canonical chain. Deep forks fail closed.
  const previous=cfg.last_block>=this.startBlock?await provider.getBlock(cfg.last_block):null;
  if(cfg.last_block>=this.startBlock&&(!previous||previous.hash!==cfg.block_hash))throw Error('Checkpoint reorg detected; operator must rebuild this index from deployment block');
  const completeBlock=independent&&typeof eventReader.readCompleteBlockEvents==='function',from=completeBlock?cfg.last_block+1:Math.max(this.startBlock,cfg.last_block-replay+1);if(from>target)return this.status();let width=span,to=Math.min(target,from+width-1);
  if(to<cfg.last_block)throw Error('RPC head regressed below checkpoint; refusing rollback');
  let block,logs;for(;;){to=Math.min(target,from+width-1);block=await provider.getBlock(to);if(!block?.hash)throw Error('Missing canonical block');logs=await provider.getLogs({address:this.address,fromBlock:from,toBlock:to,topics:[[...['Listed','Purchased','Cancelled'].map(n=>MARKET_EVENTS.getEvent(n).topicHash)]]});if(!completeBlock||!Array.isArray(logs)||logs.length<=512||from===to)break;width=Math.max(1,Math.floor(width/2))}if(completeBlock&&Array.isArray(logs)&&logs.length>1024)throw Error('Complete market block exceeds1024 events');
  if(logs.length>10000)throw Error('Too many events: reduce block span');
  if(logs.some(l=>l.removed||l.blockNumber<from||l.blockNumber>to||l.address&&l.address.toLowerCase()!==this.address))throw Error('Invalid or out-of-range market logs');
  const parsed=logs.map(l=>{const e=MARKET_EVENTS.parseLog(l);return {tx:l.transactionHash,index:l.index,block:l.blockNumber,id:key(e.args.id),kind:e.name,payload:JSON.stringify(e.name==='Listed'?{seller:e.args.seller.toLowerCase(),nft:e.args.nft.toLowerCase(),tokenId:e.args.tokenId.toString(),priceWei:e.args.price.toString()}: {})}});
  // Validate head did not change during the RPC fetch.
  if((await provider.getBlock(to))?.hash!==block.hash)throw Error('Canonical block changed during sync');
  const evidence=independent?await verifyCollectionPublication({provider,chainReader,eventReader,address:this.address,topics:['Listed','Purchased','Cancelled'].map(n=>MARKET_EVENTS.getEvent(n).topicHash),fromBlock:from,toBlock:to,ancestor:from-1,startBlock:this.startBlock,logs,expectedEndHash:block.hash,signal,timeoutMs:agreementTimeoutMs}):{};if(signal?.aborted)throw Error('Market sync cancelled');
  this.db.exec('BEGIN IMMEDIATE');
  try{
   // Optimistic lease: another process may have advanced during our RPC calls.
   const now=this.db.prepare('SELECT last_block,block_hash FROM config WHERE id=1').get();
   if(now.last_block!==cfg.last_block||now.block_hash!==cfg.block_hash)throw Error('Concurrent sync; retry');
   const affected=new Set(this.db.prepare('SELECT DISTINCT id FROM events WHERE block>=?').all(from).map(r=>r.id));
   this.db.prepare('DELETE FROM events WHERE block>=?').run(from);
   const insert=this.db.prepare('INSERT INTO events VALUES(?,?,?,?,?,?)');
   for(const e of parsed){insert.run(e.tx,e.index,e.block,e.id,e.kind,e.payload);affected.add(e.id)}
   for(const id of affected){
    this.db.prepare('DELETE FROM orders WHERE id=?').run(id);
    const events=this.db.prepare('SELECT * FROM events WHERE id=? ORDER BY block,log_index').all(id);let order;
    for(const e of events){if(e.kind==='Listed')order={...JSON.parse(e.payload),active:1};else if(order)order.active=0}
    if(order)this.db.prepare('INSERT INTO orders VALUES(?,?,?,?,?,?)').run(id,order.seller,order.nft,order.tokenId,order.priceWei,order.active);
   }
   this.db.prepare('UPDATE config SET last_block=?,block_hash=?,updated_at=? WHERE id=1').run(to,block.hash,Date.now());
   this.db.exec('COMMIT');
  }catch(e){this.db.exec('ROLLBACK');throw e}
  return {...this.status(),...evidence};
 }
}
