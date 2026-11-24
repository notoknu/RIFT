import {beginReceiptScan,receiptSlice} from '../shared/receipt-backfill.js';
const guard='EXISTS(SELECT 1 FROM edge_market_state WHERE id=1 AND lease=? AND lease_until>?)';
const projectSQL=`INSERT OR REPLACE INTO edge_market_orders SELECT c.id,json_extract(c.payload,'$.seller'),json_extract(c.payload,'$.nft'),json_extract(c.payload,'$.tokenId'),json_extract(c.payload,'$.priceWei'),CASE WHEN (SELECT e.kind FROM edge_market_events e WHERE e.id=c.id ORDER BY e.block DESC,e.log_index DESC LIMIT 1)='Listed' THEN 1 ELSE 0 END FROM edge_market_events c WHERE c.kind='Listed'`;
export async function checkpointStatements(db,block,hash,lease,now){return [db.prepare('INSERT OR REPLACE INTO edge_market_checkpoints SELECT ?,? WHERE '+guard).bind(block,hash,lease,now()),db.prepare('DELETE FROM edge_market_checkpoints WHERE block NOT IN (SELECT block FROM edge_market_checkpoints ORDER BY block DESC LIMIT 32) AND '+guard).bind(lease,now())]}
export async function recoverLegacyFork(env,{cfg,rpc,lease,now}){
 const points=(await env.DB.prepare('SELECT * FROM edge_market_checkpoints ORDER BY block DESC LIMIT 32').all()).results;let ancestor=cfg.start_block-1,hash=null,found=false;
 // At most eight canonical probes per invocation. No loss of earlier points:
 // inspect the oldest retained point too before requiring a verified rebuild.
 const probes=points.length<=8?points:[...points.slice(0,7),points.at(-1)];
 for(const point of probes){if((await rpc('eth_getBlockByNumber',['0x'+point.block.toString(16),false]))?.hash===point.hash){ancestor=point.block;hash=point.hash;found=true;break}}
 if(!found&&cfg.last_block-cfg.start_block>=4096)throw Error('Canonical checkpoint changed beyond automatic recovery window; verified rebuild required');
 const db=env.DB,statements=[db.prepare('DELETE FROM edge_market_events WHERE block>? AND '+guard).bind(ancestor,lease,now()),db.prepare('DELETE FROM edge_market_orders WHERE '+guard).bind(lease,now()),db.prepare(projectSQL+' AND '+guard).bind(lease,now()),db.prepare('DELETE FROM edge_market_checkpoints WHERE block>? AND '+guard).bind(ancestor,lease,now())];
 for(const table of ['edge_market_pending','edge_market_receipt_scan','edge_market_receipt_queue'])statements.push(db.prepare('DELETE FROM '+table+' WHERE '+guard).bind(lease,now()));
 statements.push(db.prepare('UPDATE edge_market_state SET last_block=?,block_hash=?,error=NULL,updated=? WHERE id=1 AND last_block=? AND lease=? AND lease_until>?').bind(ancestor,hash,now(),cfg.last_block,lease,now()));
 const result=await db.batch(statements);if(result.at(-1).meta.changes!==1)throw Error('Recovery lease lost');return {reorgRecovered:true,ancestor};
}
export async function beginEdgeReceipts(env,{rpc,block,lease,now}){const scan=await beginReceiptScan(rpc,block);const row=await env.DB.prepare('INSERT INTO edge_market_receipt_scan SELECT 1,?,?,?,0 WHERE '+guard+' RETURNING id').bind(scan.block,scan.hash,JSON.stringify(scan.transactions),lease,now()).first();if(!row)throw Error('Receipt initialization lease lost');return {receiptBackfill:true,block,processed:0,total:scan.transactions.length}}
export async function stepEdgeReceipts(env,{scan,rpc,address,topics,lease,now,head,previous,decode}){
 const db=env.DB,block=scan.block,hash=scan.block_hash,canonical=await rpc('eth_getBlockByNumber',['0x'+block.toString(16),false]);
 if(canonical?.hash!==hash){const statements=[db.prepare('DELETE FROM edge_market_events WHERE block=? AND '+guard).bind(block,lease,now())];for(const table of ['edge_market_receipt_scan','edge_market_receipt_queue'])statements.push(db.prepare('DELETE FROM '+table+' WHERE '+guard).bind(lease,now()));await db.batch(statements);return {discardedReceiptFork:true}}
 const queue=await db.prepare('SELECT * FROM edge_market_receipt_queue WHERE id=1').first();
 let cursor=scan.cursor;
 if(queue){const logs=JSON.parse(queue.logs),chunk=logs.slice(queue.offset,queue.offset+20),next=queue.offset+chunk.length,statements=chunk.map(log=>{const e=decode(log,block,hash);return db.prepare('INSERT INTO edge_market_events SELECT ?,?,?,?,?,?,? WHERE '+guard).bind(e.tx,e.index,block,hash,e.id,e.kind,e.payload,lease,now())});
  if(next===logs.length){statements.push(db.prepare('DELETE FROM edge_market_receipt_queue WHERE id=1 AND offset=? AND '+guard).bind(queue.offset,lease,now()));statements.push(db.prepare('UPDATE edge_market_receipt_scan SET cursor=? WHERE id=1 AND cursor=? AND '+guard).bind(queue.next_cursor,scan.cursor,lease,now()));cursor=queue.next_cursor}
  else statements.push(db.prepare('UPDATE edge_market_receipt_queue SET offset=? WHERE id=1 AND offset=? AND '+guard).bind(next,queue.offset,lease,now()));
  const result=await db.batch(statements);if(result.at(-1).meta.changes!==1)throw Error('Receipt queue lease lost');if(next<logs.length)return {receiptBackfill:true,block,processed:cursor,queued:logs.length-next};
 }else{
  const transactions=JSON.parse(scan.transactions);if(cursor<transactions.length){const slice=await receiptSlice(rpc,{block,hash,transactions,cursor},{address,topics,limit:1});
   if(slice.logs.length){const encoded=JSON.stringify(slice.logs);if(new TextEncoder().encode(encoded).length>1500000)throw Error('Single receipt queue exceeds safe D1 row size');const inserted=await db.prepare('INSERT INTO edge_market_receipt_queue SELECT 1,?,0,? WHERE '+guard+' RETURNING id').bind(encoded,slice.cursor,lease,now()).first();if(!inserted)throw Error('Receipt queue lease lost');return {receiptBackfill:true,block,processed:cursor,queued:slice.logs.length}}
   const updated=await db.prepare('UPDATE edge_market_receipt_scan SET cursor=? WHERE id=1 AND cursor=? AND '+guard+' RETURNING id').bind(slice.cursor,cursor,lease,now()).first();if(!updated)throw Error('Receipt cursor lease lost');cursor=slice.cursor;
  }
 }
 const total=JSON.parse(scan.transactions).length;if(cursor<total)return {receiptBackfill:true,block,processed:cursor,total};
 if((await rpc('eth_getBlockByNumber',['0x'+block.toString(16),false]))?.hash!==hash)throw Error('Receipt checkpoint changed before commit');
 const statements=[db.prepare(projectSQL+' AND c.id IN (SELECT id FROM edge_market_events WHERE block=?) AND '+guard).bind(block,lease,now()),...await checkpointStatements(db,block,hash,lease,now),db.prepare('DELETE FROM edge_market_receipt_scan WHERE id=1 AND '+guard).bind(lease,now()),db.prepare('UPDATE edge_market_state SET last_block=?,block_hash=?,head=?,updated=?,error=NULL,span=1 WHERE id=1 AND last_block=? AND lease=? AND lease_until>?').bind(block,hash,head,now(),previous,lease,now())];
 const result=await db.batch(statements);if(result.at(-1).meta.changes!==1)throw Error('Receipt publication lease lost');return {receiptBackfill:false,block,processed:cursor,total};
}
