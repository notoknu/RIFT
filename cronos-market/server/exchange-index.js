import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';import {dirname} from 'node:path';
import {isAddress} from 'ethers';
import {decodeExchangeLog,reduceExchange,orderKey,EXCHANGE_EVENTS,exchangeInterface} from '../shared/exchange.js';
export class ExchangeIndex{
 constructor({path='data/exchange.sqlite',address,startBlock}){
  if(!isAddress(address)||!Number.isSafeInteger(startBlock)||startBlock<0)throw Error('Explicit exchange address/deployment block required');
  mkdirSync(dirname(path),{recursive:true,mode:0o700});this.db=new DatabaseSync(path);if(path!==':memory:')chmodSync(path,0o600);this.address=address.toLowerCase();this.startBlock=startBlock;
  this.db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;
   CREATE TABLE IF NOT EXISTS exchange_state(id INTEGER PRIMARY KEY CHECK(id=1),address TEXT,start_block INTEGER,last_block INTEGER,block_hash TEXT,updated INTEGER);
   CREATE TABLE IF NOT EXISTS exchange_events(tx TEXT,log_index INTEGER,block INTEGER,block_hash TEXT,type TEXT,id TEXT,kind TEXT,payload TEXT,PRIMARY KEY(tx,log_index));
   CREATE INDEX IF NOT EXISTS exchange_event_order ON exchange_events(type,id,block,log_index);
   CREATE INDEX IF NOT EXISTS exchange_event_block ON exchange_events(block);
   CREATE TABLE IF NOT EXISTS exchange_orders(type TEXT,id TEXT,account TEXT,nft TEXT,active INTEGER,expiry INTEGER,document TEXT,PRIMARY KEY(type,id));
   CREATE INDEX IF NOT EXISTS exchange_order_page ON exchange_orders(type,active,id);
   CREATE INDEX IF NOT EXISTS exchange_nft_orders ON exchange_orders(nft,type,id);
   CREATE TABLE IF NOT EXISTS exchange_checkpoints(block INTEGER PRIMARY KEY,hash TEXT);`);
  const state=this.state();if(state&&(state.address!==this.address||state.start_block!==startBlock)){this.db.close();throw Error('Exchange binding mismatch')}
  if(!state)this.db.prepare('INSERT INTO exchange_state VALUES(1,?,?,?,NULL,NULL)').run(this.address,startBlock,startBlock-1);
 }
 state(){return this.db.prepare('SELECT * FROM exchange_state WHERE id=1').get()}
 close(){this.db.close()}
 status(){const s=this.state();return {chainId:25,address:this.address,startBlock:this.startBlock,indexedThrough:s.last_block,blockHash:s.block_hash,updatedAt:s.updated?new Date(s.updated).toISOString():null,scope:'RIFT v2 events only; 12-confirmation lag; live state must be checked before signing'}}
 page({type='listing',cursor,account,nft,limit=24,includeClosed=false}={}){
  if(!['listing','offer'].includes(type)||!Number.isInteger(limit)||limit<1||limit>48||account&&!isAddress(account)||nft&&!isAddress(nft))throw Error('Invalid exchange query');
  const conditions=['type=?'],args=[type];if(!includeClosed){conditions.push('active=1','(expiry=0 OR expiry>?)');args.push(Math.floor(Date.now()/1000))}
  if(cursor!=null){conditions.push('id<?');args.push(orderKey(cursor))}if(account){conditions.push('account=?');args.push(account.toLowerCase())}if(nft){conditions.push('nft=?');args.push(nft.toLowerCase())}
  const rows=this.db.prepare('SELECT document FROM exchange_orders WHERE '+conditions.join(' AND ')+' ORDER BY id DESC LIMIT ?').all(...args,limit+1),items=rows.slice(0,limit).map(r=>JSON.parse(r.document));return {items,nextCursor:rows.length>limit?items.at(-1).id:null,coverage:this.status()};
 }
 activity({nft,cursor,limit=24}={}){
  if(!isAddress(nft)||!Number.isInteger(limit)||limit<1||limit>48||cursor&&!/^\d{1,15}:\d{1,10}$/.test(cursor))throw Error('Invalid activity query');
  const conditions=['o.nft=?'],args=[nft.toLowerCase()];if(cursor){const [block,index]=cursor.split(':').map(Number);if(!Number.isSafeInteger(block)||!Number.isSafeInteger(index))throw Error('Invalid activity cursor');conditions.push('(e.block<? OR (e.block=? AND e.log_index<?))');args.push(block,block,index)}
  const rows=this.db.prepare('SELECT e.* FROM exchange_events e JOIN exchange_orders o ON o.type=e.type AND o.id=e.id WHERE '+conditions.join(' AND ')+' ORDER BY e.block DESC,e.log_index DESC LIMIT ?').all(...args,limit+1),items=rows.slice(0,limit).map(r=>({transactionHash:r.tx,logIndex:r.log_index,block:r.block,blockHash:r.block_hash,type:r.type,id:BigInt(r.id).toString(),kind:r.kind,...JSON.parse(r.payload)}));return {items,nextCursor:rows.length>limit?items.at(-1).block+':'+items.at(-1).logIndex:null,coverage:this.status()};
 }
 project(type,id){
  let order;for(const e of this.db.prepare('SELECT kind,payload FROM exchange_events WHERE type=? AND id=? ORDER BY block,log_index').all(type,id))order=reduceExchange(order,{kind:e.kind,payload:JSON.parse(e.payload)});
  this.db.prepare('DELETE FROM exchange_orders WHERE type=? AND id=?').run(type,id);if(order)this.db.prepare('INSERT INTO exchange_orders VALUES(?,?,?,?,?,?,?)').run(type,id,order.seller||order.buyer,order.nft,BigInt(order.remaining)>0n?1:0,Number(order.expiry),JSON.stringify(order));
 }
 async sync(provider,{span=256,confirmations=12}={}){
  if(!Number.isInteger(span)||span<1||span>2000||!Number.isInteger(confirmations)||confirmations<12)throw Error('Invalid sync bounds');
  if(Number((await provider.getNetwork()).chainId)!==25)throw Error('Wrong chain');
  const cfg=this.state(),head=await provider.getBlockNumber(),target=head-confirmations;if(target<cfg.last_block)throw Error('RPC head regressed');
  let ancestor=cfg.last_block;
  if(ancestor>=this.startBlock&&(await provider.getBlock(ancestor))?.hash!==cfg.block_hash){
   ancestor=this.startBlock-1;let found=false;
   const checkpoints=this.db.prepare('SELECT block,hash FROM exchange_checkpoints ORDER BY block DESC LIMIT 32').all();
   for(const point of checkpoints){if((await provider.getBlock(point.block))?.hash===point.hash){ancestor=point.block;found=true;break}}
   if(!found&&cfg.last_block-this.startBlock>=span*32)throw Error('Reorg beyond retained recovery window; verified rebuild required');
  }
  const from=ancestor+1,to=Math.min(target,from+span-1);if(to<from)return this.status();
  const block=await provider.getBlock(to);if(!block?.hash)throw Error('Missing canonical block');
  const logs=await provider.getLogs({address:this.address,fromBlock:from,toBlock:to,topics:[EXCHANGE_EVENTS.map(n=>exchangeInterface.getEvent(n).topicHash)]});
  if(!Array.isArray(logs)||logs.length>10000)throw Error('Oversized logs; reduce span');
  const keys=new Set(),positions=new Set(),blocks=new Map();const events=logs.map(l=>{
   if(l.removed||l.address?.toLowerCase()!==this.address||!Number.isSafeInteger(l.index)||l.index<0||!Number.isSafeInteger(l.blockNumber)||l.blockNumber<from||l.blockNumber>to||!/^0x[\da-f]{64}$/i.test(l.transactionHash)||!/^0x[\da-f]{64}$/i.test(l.blockHash))throw Error('Invalid exchange log');
   const key=l.transactionHash+':'+l.index,position=l.blockNumber+':'+l.index;if(keys.has(key)||positions.has(position))throw Error('Duplicate log');keys.add(key);positions.add(position);if(blocks.has(l.blockNumber)&&blocks.get(l.blockNumber)!==l.blockHash.toLowerCase())throw Error('Conflicting log block hashes');blocks.set(l.blockNumber,l.blockHash.toLowerCase());return {...decodeExchangeLog(l),tx:l.transactionHash,index:l.index,block:l.blockNumber,hash:l.blockHash};
  });
  // A matching end checkpoint alone does not validate each returned log's fork.
  const blockEntries=[...blocks];let blockCursor=0;
  const validated=await Promise.allSettled(Array.from({length:Math.min(4,blockEntries.length)},async()=>{
   while(blockCursor<blockEntries.length){const [number,expected]=blockEntries[blockCursor++];const canonical=await provider.getBlock(number);if(typeof canonical?.hash!=='string'||canonical.hash.toLowerCase()!==expected)throw Error('Noncanonical exchange log block');}
  }));
  const invalidBlock=validated.find(result=>result.status==='rejected');if(invalidBlock)throw invalidBlock.reason;
  if((await provider.getBlock(to))?.hash!==block.hash)throw Error('Chain changed during fetch');
  if(ancestor>=this.startBlock&&ancestor!==cfg.last_block){const checkpoint=this.db.prepare('SELECT hash FROM exchange_checkpoints WHERE block=?').get(ancestor);if((await provider.getBlock(ancestor))?.hash!==checkpoint?.hash)throw Error('Recovery ancestor changed')}
  this.db.exec('BEGIN IMMEDIATE');try{
   const current=this.state();if(current.last_block!==cfg.last_block||current.block_hash!==cfg.block_hash)throw Error('Concurrent sync');
   const affected=new Map();for(const r of this.db.prepare('SELECT DISTINCT type,id FROM exchange_events WHERE block>?').all(ancestor))affected.set(r.type+':'+r.id,r);
   this.db.prepare('DELETE FROM exchange_events WHERE block>?').run(ancestor);this.db.prepare('DELETE FROM exchange_checkpoints WHERE block>?').run(ancestor);
   const insert=this.db.prepare('INSERT INTO exchange_events VALUES(?,?,?,?,?,?,?,?)');for(const e of events){insert.run(e.tx,e.index,e.block,e.hash,e.type,e.id,e.kind,JSON.stringify(e.payload));affected.set(e.type+':'+e.id,e)}
   for(const e of affected.values())this.project(e.type,e.id);
   this.db.prepare('INSERT OR REPLACE INTO exchange_checkpoints VALUES(?,?)').run(to,block.hash);this.db.prepare('DELETE FROM exchange_checkpoints WHERE block NOT IN (SELECT block FROM exchange_checkpoints ORDER BY block DESC LIMIT 32)').run();
   this.db.prepare('UPDATE exchange_state SET last_block=?,block_hash=?,updated=? WHERE id=1').run(to,block.hash,Date.now());this.db.exec('COMMIT');
  }catch(error){this.db.exec('ROLLBACK');throw error}return this.status();
 }
}
