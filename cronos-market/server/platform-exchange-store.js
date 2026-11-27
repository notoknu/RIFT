import {candidateEventPolicy} from './candidate-block-profile.js';
import {validateOrderPage,validateActivityPage,queryOrderPage,queryActivity} from './platform-exchange-queries.js';
import {createClient} from '@libsql/client/web';
import {createHash} from 'node:crypto';
import {isAddress,ZeroAddress} from 'ethers';
import {accountStorageConfig} from './account-storage-config.js';
import {PLATFORM_INDEX_SCHEMA,PLATFORM_INDEX_SCHEMA_VERSION} from '../shared/platform-index-schema.js';
import {decodeExchangeLog,reduceExchange,orderKey} from '../shared/exchange.js';
const checksum=createHash('sha256').update(PLATFORM_INDEX_SCHEMA.join(';\n')).digest('hex');
const HASH=/^0x[\da-f]{64}$/i;
class StoreError extends Error{constructor(code){super(code);this.name='PlatformIndexError';this.code=code;}}
function demand(condition,code){if(!condition)throw new StoreError(code)}
function safeBlock(n){return Number.isSafeInteger(n)&&n>=0&&n<Number.MAX_SAFE_INTEGER}
const sql=(sql,args=[])=>({sql,args});
const dbTime=async tx=>Number((await tx.execute("SELECT CAST(strftime('%s','now') AS INTEGER)*1000+CAST(substr(strftime('%f','now'),4,3) AS INTEGER) AS now")).rows[0].now);
function identity(binding){demand(binding?.chainId===25&&isAddress(binding.address||'')&&binding.address.toLowerCase()!==ZeroAddress&&safeBlock(binding.startBlock)&&HASH.test(binding.runtimeHash||''),'INVALID_STREAM_BINDING');return {...binding,address:binding.address.toLowerCase(),runtimeHash:binding.runtimeHash.toLowerCase(),stream:'25:exchange:'+binding.address.toLowerCase()};}
function same(row,b){return Number(row.chain)===25&&row.address===b.address&&Number(row.start_block)===b.startBlock&&row.runtime_hash===b.runtimeHash}
function leaseArgs(lease){demand(lease&&typeof lease.owner==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(lease.owner)&&Number.isSafeInteger(lease.fence)&&lease.fence>0,'INVALID_LEASE');}
function ttl(value){demand(Number.isSafeInteger(value)&&value>=1000&&value<=60000,'INVALID_LEASE_TTL');return value;}

/** Candidate remote exchange repository. Not wired into production routes/workers yet. */
export class PlatformExchangeStore{
 constructor(client){this.client=client;this.tail=Promise.resolve();this.closed=false;this.requiresReopen=false;}
 async _serial(fn){demand(!this.closed,'STORE_CLOSED');const job=this.tail.then(()=>{demand(!this.requiresReopen,'STORE_REOPEN_REQUIRED');return fn()});this.tail=job.catch(()=>{});return job;}
 async _tx(fn){return this._serial(async()=>{let tx;try{tx=await this.client.transaction('write');const result=await fn(tx);await tx.commit();return result;}catch(error){try{await tx?.rollback()}catch{this.requiresReopen=true}if(error instanceof StoreError)throw error;this.requiresReopen=true;throw new StoreError('PLATFORM_INDEX_TRANSACTION_FAILED');}finally{try{tx?.close()}catch{this.requiresReopen=true}}});}
 async _read(fn){return this._serial(async()=>{try{return await fn(this.client)}catch(error){if(error instanceof StoreError)throw error;this.requiresReopen=true;throw new StoreError('PLATFORM_INDEX_READ_FAILED')}});}
 async _snapshot(fn){return this._serial(async()=>{let tx;try{tx=await this.client.transaction('read');const result=await fn(tx);await tx.commit();return result;}catch(error){try{await tx?.rollback()}catch{this.requiresReopen=true}if(error instanceof StoreError)throw error;this.requiresReopen=true;throw new StoreError('PLATFORM_INDEX_READ_FAILED');}finally{try{tx?.close()}catch{this.requiresReopen=true}}});}
 _coverage(row){return {...this._publicState(row),scope:'RIFT exchange repository snapshot only; not a live quote or independent confirmation/canonicality certificate',pagination:'Use the returned revision on subsequent pages to reject a changed indexed projection; expiry is evaluated at database time per request'};}
 async checkpoints(binding){const b=identity(binding);return this._snapshot(async db=>{const row=await this._state(db,b);const points=(await db.execute(sql('SELECT block,hash FROM rift_exchange_checkpoints WHERE stream=? ORDER BY block DESC LIMIT 32',[b.stream]))).rows.map(p=>({block:Number(p.block),hash:p.hash}));return {items:points,coverage:this._coverage(row)};});}
 async page(binding,options={}){const b=identity(binding);let q;try{q=validateOrderPage(options)}catch(error){throw new StoreError(['INVALID_PAGE_QUERY','INVALID_PAGE_CURSOR'].includes(error.message)?error.message:'INVALID_PAGE_QUERY')}return this._snapshot(async db=>{const row=await this._state(db,b);if(q.revision!==undefined)demand(q.revision===Number(row.revision),'CURSOR_REVISION_CHANGED');return {...await queryOrderPage(db,b.stream,q,Math.floor(await dbTime(db)/1000)),coverage:this._coverage(row)};});}
 async activity(binding,options={}){const b=identity(binding);let q;try{q=validateActivityPage(options)}catch(error){throw new StoreError(['INVALID_ACTIVITY_QUERY','INVALID_ACTIVITY_CURSOR'].includes(error.message)?error.message:'INVALID_ACTIVITY_QUERY')}return this._snapshot(async db=>{const row=await this._state(db,b);if(q.revision!==undefined)demand(q.revision===Number(row.revision),'CURSOR_REVISION_CHANGED');return {...await queryActivity(db,b.stream,q),coverage:this._coverage(row)};});}
 async status(binding){const b=identity(binding);return this._snapshot(async db=>{const row=await this._state(db,b);const orders=(await db.execute(sql('SELECT COUNT(*) AS orders FROM rift_exchange_orders WHERE stream=?',[b.stream]))).rows[0];const points=(await db.execute(sql('SELECT COUNT(*) AS checkpoints FROM rift_exchange_checkpoints WHERE stream=?',[b.stream]))).rows[0];return {...this._coverage(row),orderCount:Number(orders.orders),retainedCheckpoints:Number(points.checkpoints),ageMs:row.updated===null?null:Math.max(0,await dbTime(db)-Number(row.updated)),headObserved:false,scope:'Repository checkpoint/projection status; worker liveness, RPC head, expiry execution and network readiness are not inferred'};});}
 async initialize(){return this._tx(async tx=>{await tx.execute(PLATFORM_INDEX_SCHEMA[0]);const rows=(await tx.execute('SELECT version,checksum FROM rift_index_migrations ORDER BY version')).rows;demand(rows.length===0||rows.length===1&&Number(rows[0].version)===PLATFORM_INDEX_SCHEMA_VERSION&&rows[0].checksum===checksum,'SCHEMA_VERSION_OR_CHECKSUM_MISMATCH');for(const statement of PLATFORM_INDEX_SCHEMA.slice(1))await tx.execute(statement);if(!rows.length)await tx.execute(sql('INSERT INTO rift_index_migrations VALUES(?,?)',[PLATFORM_INDEX_SCHEMA_VERSION,checksum]));return {version:PLATFORM_INDEX_SCHEMA_VERSION,checksum};});}
 async assertSchema(){return this._read(async db=>{const rows=(await db.execute('SELECT version,checksum FROM rift_index_migrations ORDER BY version')).rows;demand(rows.length===1&&Number(rows[0].version)===1&&rows[0].checksum===checksum,'SCHEMA_VERSION_OR_CHECKSUM_MISMATCH');return {version:1,checksum};});}
 async bind(binding){const b=identity(binding);return this._tx(async tx=>{await tx.execute(sql('INSERT INTO rift_exchange_streams(stream,chain,address,start_block,runtime_hash,last_block) VALUES(?,?,?,?,?,?) ON CONFLICT(stream) DO NOTHING',[b.stream,25,b.address,b.startBlock,b.runtimeHash,b.startBlock-1]));const row=(await tx.execute(sql('SELECT * FROM rift_exchange_streams WHERE stream=?',[b.stream]))).rows[0];demand(same(row,b),'STREAM_BINDING_MISMATCH');return b;});}
 async _state(db,b){const row=(await db.execute(sql('SELECT * FROM rift_exchange_streams WHERE stream=?',[b.stream]))).rows[0];demand(row&&same(row,b),'STREAM_BINDING_MISMATCH');return row;}
 _publicState(row){return {chainId:25,address:row.address,startBlock:Number(row.start_block),runtimeHash:row.runtime_hash,indexedThrough:Number(row.last_block),blockHash:row.block_hash,revision:Number(row.revision),updatedAt:row.updated==null?null:Number(row.updated)};}
 async state(binding){const b=identity(binding);return this._read(async db=>this._publicState(await this._state(db,b)));}
 async acquire(binding,owner,{ttlMs=30000}={}){const b=identity(binding);ttl(ttlMs);demand(typeof owner==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(owner),'INVALID_LEASE_OWNER');return this._tx(async tx=>{const row=await this._state(tx,b),now=await dbTime(tx);if(row.lease_owner&&Number(row.lease_until)>now)return null;const fence=Number(row.fence)+1;demand(Number.isSafeInteger(fence),'FENCE_EXHAUSTED');await tx.execute(sql('UPDATE rift_exchange_streams SET fence=?,lease_owner=?,lease_until=? WHERE stream=?',[fence,owner,now+ttlMs,b.stream]));return {owner,fence,expiresAt:now+ttlMs};});}
 async _assertLease(tx,b,lease){leaseArgs(lease);const row=await this._state(tx,b),now=await dbTime(tx);demand(row.lease_owner===lease.owner&&Number(row.fence)===lease.fence&&Number(row.lease_until)>now,'LEASE_LOST');return {row,now};}
 async renew(binding,lease,{ttlMs=30000}={}){const b=identity(binding);ttl(ttlMs);return this._tx(async tx=>{const {now}=await this._assertLease(tx,b,lease);await tx.execute(sql('UPDATE rift_exchange_streams SET lease_until=? WHERE stream=?',[now+ttlMs,b.stream]));return {...lease,expiresAt:now+ttlMs};});}
 async release(binding,lease){const b=identity(binding);return this._tx(async tx=>{await this._assertLease(tx,b,lease);await tx.execute(sql('UPDATE rift_exchange_streams SET lease_owner=NULL,lease_until=0 WHERE stream=?',[b.stream]));return true;});}
 /** Caller must independently verify canonical RPC headers/logs and confirmation policy.
  * This method atomically stores the validated candidate range; it does not contact RPC.
  * rollbackTo must be a retained exact checkpoint (or the original predeployment boundary).
  */
 async commitRange(binding,{lease,expected,toBlock,blockHash,logs=[],rollbackTo,denseBlock}={}){
  const b=identity(binding);leaseArgs(lease);demand(expected&&Number.isSafeInteger(expected.revision)&&expected.revision>=0&&Number.isSafeInteger(expected.indexedThrough)&&expected.indexedThrough>=b.startBlock-1&&(expected.blockHash===null||HASH.test(expected.blockHash||'')),'INVALID_EXPECTED_CHECKPOINT');
  const ancestor=rollbackTo?rollbackTo.block:expected.indexedThrough;
  demand(Number.isSafeInteger(ancestor)&&ancestor>=b.startBlock-1&&ancestor<=expected.indexedThrough&&safeBlock(toBlock)&&toBlock>=b.startBlock&&toBlock>ancestor&&toBlock-ancestor<=2000&&HASH.test(blockHash||''),'INVALID_RANGE');
  const policy=candidateEventPolicy(b,{expected,toBlock,blockHash,logs,rollbackTo,denseBlock});demand(Array.isArray(logs)&&logs.length<=policy.events,'EVENT_BATCH_LIMIT');
  let bytes=0;const keys=new Set(),positions=new Set(),hashes=new Map();
  const events=logs.map(log=>{demand(log&&!log.removed&&log.address?.toLowerCase()===b.address&&safeBlock(log.blockNumber)&&log.blockNumber>ancestor&&log.blockNumber<=toBlock&&safeBlock(log.index)&&HASH.test(log.blockHash||'')&&HASH.test(log.transactionHash||''),'INVALID_EVENT');
   const key=log.transactionHash.toLowerCase()+':'+log.index,position=log.blockNumber+':'+log.index;demand(!keys.has(key)&&!positions.has(position),'DUPLICATE_EVENT');keys.add(key);positions.add(position);
   const hash=log.blockHash.toLowerCase();demand(!hashes.has(log.blockNumber)||hashes.get(log.blockNumber)===hash,'CONFLICTING_BLOCK_HASHES');hashes.set(log.blockNumber,hash);if(log.blockNumber===toBlock)demand(hash===blockHash.toLowerCase(),'END_BLOCK_HASH_MISMATCH');
   demand(typeof log.data==='string'&&/^0x(?:[a-f0-9]{2})*$/i.test(log.data)&&log.data.length<=16386&&Array.isArray(log.topics)&&log.topics.length>=1&&log.topics.length<=4&&log.topics.every(topic=>HASH.test(topic)),'EVENT_ENCODING_LIMIT');
   bytes+=log.data.length/2+log.topics.length*32;demand(bytes<=policy.bytes,'EVENT_BYTES_LIMIT');
   let decoded;try{decoded=decodeExchangeLog(log)}catch{throw new StoreError('INVALID_EXCHANGE_EVENT')}
   const payload=JSON.stringify(decoded.payload);bytes+=Buffer.byteLength(payload);demand(bytes<=policy.bytes,'EVENT_BYTES_LIMIT');return {...decoded,payload,tx:log.transactionHash.toLowerCase(),index:log.index,block:log.blockNumber,hash};
  }).sort((a,c)=>a.block-c.block||a.index-c.index);
  return this._tx(async tx=>{
   const {row,now}=await this._assertLease(tx,b,lease);
   demand(Number.isSafeInteger(Number(row.revision))&&Number(row.revision)<Number.MAX_SAFE_INTEGER,'REVISION_EXHAUSTED');
   demand(Number(row.revision)===expected.revision&&Number(row.last_block)===expected.indexedThrough&&row.block_hash===expected.blockHash,'CHECKPOINT_CONFLICT');
   if(rollbackTo){demand(rollbackTo.block<expected.indexedThrough,'INVALID_ROLLBACK');if(ancestor===b.startBlock-1)demand(rollbackTo.hash===null,'INVALID_ROLLBACK');else{const point=(await tx.execute(sql('SELECT hash FROM rift_exchange_checkpoints WHERE stream=? AND block=?',[b.stream,ancestor]))).rows[0];demand(point&&HASH.test(rollbackTo.hash||'')&&point.hash===rollbackTo.hash.toLowerCase(),'UNKNOWN_ROLLBACK_CHECKPOINT');}}
   const affected=new Map();const orphaned=(await tx.execute(sql('SELECT DISTINCT type,order_id FROM rift_exchange_events WHERE stream=? AND block>? LIMIT ?',[b.stream,ancestor,policy.events+1]))).rows;demand(orphaned.length<=policy.events,'ROLLBACK_PROJECTION_LIMIT');for(const r of orphaned)affected.set(r.type+':'+r.order_id,{type:r.type,id:r.order_id});
   await tx.execute(sql('DELETE FROM rift_exchange_events WHERE stream=? AND block>?',[b.stream,ancestor]));await tx.execute(sql('DELETE FROM rift_exchange_checkpoints WHERE stream=? AND block>?',[b.stream,ancestor]));
   for(const event of events){await tx.execute(sql('INSERT INTO rift_exchange_events VALUES(?,?,?,?,?,?,?,?,?)',[b.stream,event.tx,event.index,event.block,event.hash,event.type,event.id,event.kind,event.payload]));affected.set(event.type+':'+event.id,event);}
   demand(affected.size<=policy.events,'PROJECTION_BATCH_LIMIT');
   for(const event of affected.values()){
    const history=(await tx.execute(sql('SELECT kind,payload FROM rift_exchange_events WHERE stream=? AND type=? AND order_id=? ORDER BY block,log_index LIMIT 10001',[b.stream,event.type,event.id]))).rows;demand(history.length<=10000,'PROJECTION_HISTORY_LIMIT');let order;
    try{for(const item of history)order=reduceExchange(order,{kind:item.kind,payload:JSON.parse(item.payload)})}catch{throw new StoreError('INVALID_ORDER_TRANSITION')}
    await tx.execute(sql('DELETE FROM rift_exchange_orders WHERE stream=? AND type=? AND order_id=?',[b.stream,event.type,event.id]));
    if(order)await tx.execute(sql('INSERT INTO rift_exchange_orders VALUES(?,?,?,?,?,?,?,?)',[b.stream,event.type,event.id,order.seller||order.buyer,order.nft,BigInt(order.remaining)>0n?1:0,Number(order.expiry),JSON.stringify(order)]));
   }
   await tx.execute(sql('INSERT INTO rift_exchange_checkpoints VALUES(?,?,?)',[b.stream,toBlock,blockHash.toLowerCase()]));
   await tx.execute(sql('DELETE FROM rift_exchange_checkpoints WHERE stream=? AND block NOT IN (SELECT block FROM rift_exchange_checkpoints WHERE stream=? ORDER BY block DESC LIMIT 32)',[b.stream,b.stream]));
   // Revalidate server-side time after all statements: an expired/stolen worker cannot publish.
   const final=await this._assertLease(tx,b,lease);demand(final.now>=now,'DATABASE_CLOCK_REGRESSED');
   await tx.execute(sql('UPDATE rift_exchange_streams SET last_block=?,block_hash=?,revision=revision+1,updated=? WHERE stream=?',[toBlock,blockHash.toLowerCase(),final.now,b.stream]));return this._publicState(await this._state(tx,b));
  });
 }
 async inspectRange(binding,{fromBlock,toBlock,denseBlock}={}){const b=identity(binding),eventLimit=denseBlock?.profile==='rift-candidate-complete-block-v1'?1024:512;demand(safeBlock(fromBlock)&&safeBlock(toBlock)&&fromBlock>=b.startBlock&&toBlock>=fromBlock&&toBlock-fromBlock<2000,'INVALID_INSPECTION_RANGE');return this._snapshot(async db=>{const row=await this._state(db,b);const events=(await db.execute(sql('SELECT tx,log_index,block,block_hash,type,order_id,kind,payload FROM rift_exchange_events WHERE stream=? AND block>=? AND block<=? ORDER BY block,log_index LIMIT ?',[b.stream,fromBlock,toBlock,eventLimit+1]))).rows;demand(events.length<=eventLimit,'INSPECTION_EVENT_LIMIT');return {state:this._publicState(row),events:events.map(e=>({tx:e.tx,index:Number(e.log_index),block:Number(e.block),hash:e.block_hash,type:e.type,id:e.order_id,kind:e.kind,payload:JSON.parse(e.payload)}))};});}
 async order(binding,type,id){const b=identity(binding);demand(['listing','offer'].includes(type),'INVALID_ORDER_TYPE');let key;try{key=orderKey(id)}catch{throw new StoreError('INVALID_ORDER_ID')}return this._snapshot(async db=>{await this._state(db,b);const row=(await db.execute(sql('SELECT document FROM rift_exchange_orders WHERE stream=? AND type=? AND order_id=?',[b.stream,type,key]))).rows[0];return row?JSON.parse(row.document):null;});}
 async close(){this.closed=true;await this.tail;try{this.client.close()}catch{}}
}
/** No implicit migration or SQLite fallback. Production wiring deliberately not enabled. */
export async function openPlatformExchangeStore(env,{clientFactory=createClient}={}){
 demand(env?.CREATOR_DB_DRIVER==='libsql'&&accountStorageConfig(env).configured,'REMOTE_INDEX_CONFIGURATION_REQUIRED');let client,store;
 try{client=clientFactory({url:env.CREATOR_LIBSQL_URL,authToken:env.CREATOR_LIBSQL_AUTH_TOKEN,fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.any([init?.signal,AbortSignal.timeout(15000)].filter(Boolean))})});store=new PlatformExchangeStore(client);await store.assertSchema();return store;}catch{try{client?.close()}catch{}throw new StoreError('REMOTE_INDEX_OPEN_FAILED_NO_FALLBACK');}
}

export {identity as platformExchangeBinding,StoreError as PlatformIndexError};
