import {checkpointStatements} from './market-recovery.js';
// Stage only event history until the entire dense block is present. Public order
// projections and their checkpoint change atomically, never on partial chunks.
const guard='EXISTS(SELECT 1 FROM edge_market_state WHERE id=1 AND lease=? AND lease_until>?)';
export async function stageDenseMarket(env,{pending,lease,now,head,previous}){
 const rows=JSON.parse(pending.events),chunk=rows.slice(pending.offset,pending.offset+20),next=pending.offset+chunk.length,done=next===rows.length;
 const statements=chunk.map(e=>env.DB.prepare('INSERT OR IGNORE INTO edge_market_events SELECT ?,?,?,?,?,?,? WHERE '+guard).bind(e.tx,e.index,pending.block,pending.block_hash,e.id,e.kind,e.payload,lease,now()));
 if(done){
  statements.push(env.DB.prepare(`INSERT OR REPLACE INTO edge_market_orders
   SELECT c.id,json_extract(c.payload,'$.seller'),json_extract(c.payload,'$.nft'),json_extract(c.payload,'$.tokenId'),json_extract(c.payload,'$.priceWei'),
   CASE WHEN (SELECT e.kind FROM edge_market_events e WHERE e.id=c.id ORDER BY e.block DESC,e.log_index DESC LIMIT 1)='Listed' THEN 1 ELSE 0 END
   FROM edge_market_events c WHERE c.kind='Listed' AND c.id IN (SELECT id FROM edge_market_events WHERE block=?) AND `+guard).bind(pending.block,lease,now()));
  statements.push(...await checkpointStatements(env.DB,pending.block,pending.block_hash,lease,now));
  statements.push(env.DB.prepare('DELETE FROM edge_market_pending WHERE id=1 AND '+guard).bind(lease,now()));
  statements.push(env.DB.prepare('UPDATE edge_market_state SET last_block=?,block_hash=?,head=?,updated=?,error=NULL,span=1 WHERE id=1 AND last_block=? AND lease=? AND lease_until>?').bind(pending.block,pending.block_hash,head,now(),previous,lease,now()));
 }else{
  statements.push(env.DB.prepare('UPDATE edge_market_pending SET offset=? WHERE id=1 AND offset=? AND '+guard).bind(next,pending.offset,lease,now()));
 }
 const results=await env.DB.batch(statements);if(results.at(-1).meta.changes!==1)throw Error('Dense block lease/cursor lost');return {staging:!done,block:pending.block,staged:next,total:rows.length};
}
