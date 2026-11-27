import {createHash} from 'node:crypto';
import {platformExchangeBinding,PlatformIndexError} from './platform-exchange-store.js';
import {exchangeInterface,decodeExchangeLog,reduceExchange,orderKey} from '../shared/exchange.js';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const demand=(ok)=>{if(!ok)throw new PlatformIndexError('INVALID_PLATFORM_SNAPSHOT')};
const HASH=/^0x[\da-f]{64}$/;
const safe=n=>Number.isSafeInteger(n)&&n>=0&&n<Number.MAX_SAFE_INTEGER;
function validate(snapshot){
 demand(snapshot&&['rift-exchange-snapshot-v1','rift-exchange-snapshot-v2'].includes(snapshot.format)&&snapshot.digest===digest(snapshot.data));
 const data=snapshot.data;demand(Buffer.byteLength(JSON.stringify(data))<=8388608);const b=platformExchangeBinding(data.binding),state=data.state;
 demand(state&&state.chainId===25&&state.address===b.address&&state.startBlock===b.startBlock&&state.runtimeHash===b.runtimeHash&&safe(state.revision)&&Number.isSafeInteger(state.indexedThrough)&&state.indexedThrough>=b.startBlock-1&&(state.updatedAt===null||safe(state.updatedAt)));
 demand(Array.isArray(data.events)&&data.events.length<=4096&&Array.isArray(data.orders)&&data.orders.length<=(snapshot.format==='rift-exchange-snapshot-v2'?1024:512)&&Array.isArray(data.checkpoints)&&data.checkpoints.length<=32);
 demand(state.revision===0?state.indexedThrough===b.startBlock-1&&state.blockHash===null&&data.events.length===0&&data.orders.length===0&&data.checkpoints.length===0:HASH.test(state.blockHash||'')&&data.checkpoints.length>=1&&data.checkpoints.length<=state.revision);
 const projections=new Map(),positions=new Set(),transactions=new Set(),blocks=new Map();let prior=null;
 for(const e of data.events){
  demand(e&&HASH.test(e.tx||'')&&HASH.test(e.hash||'')&&safe(e.index)&&safe(e.block)&&e.block>=b.startBlock&&e.block<=state.indexedThrough&&(!prior||e.block>prior.block||e.block===prior.block&&e.index>prior.index));prior=e;
  const p=e.block+':'+e.index,t=e.tx+':'+e.index;demand(!positions.has(p)&&!transactions.has(t));positions.add(p);transactions.add(t);demand(!blocks.has(e.block)||blocks.get(e.block)===e.hash);blocks.set(e.block,e.hash);
  let decoded;try{const fragment=exchangeInterface.getEvent(e.kind),encoded=exchangeInterface.encodeEventLog(fragment,fragment.inputs.map(input=>e.payload[input.name]));decoded=decodeExchangeLog(encoded)}catch{demand(false)}
  demand(decoded.id===e.id&&decoded.type===e.type&&decoded.kind===e.kind&&digest(decoded.payload)===digest(e.payload));
  const key=e.type+':'+e.id;let doc;try{doc=reduceExchange(projections.get(key),e)}catch{demand(false)}projections.set(key,doc);
 }
 const orders=[...projections].map(([key,document])=>({type:key.split(':')[0],id:orderKey(document.id),document})).sort((a,b)=>a.type.localeCompare(b.type)||a.id.localeCompare(b.id));
 demand(digest(orders)===digest(data.orders));let last=-1;
 for(const p of data.checkpoints){demand(p&&safe(p.block)&&p.block>=b.startBlock&&p.block<=state.indexedThrough&&p.block>last&&HASH.test(p.hash||'')&&(!blocks.has(p.block)||blocks.get(p.block)===p.hash));last=p.block;}
 if(state.revision){const p=data.checkpoints.at(-1);demand(p.block===state.indexedThrough&&p.hash===state.blockHash)}
 return b;
}
/** Public chain data only, bounded consistent snapshot; no lease/auth state. */
export async function exportPlatformSnapshot(store,binding){const b=platformExchangeBinding(binding),schema=await store.assertSchema();return store._snapshot(async db=>{
 const row=await store._state(db,b),state=store._publicState(row);
 const events=(await db.execute({sql:'SELECT tx,log_index,block,block_hash,type,order_id,kind,payload FROM rift_exchange_events WHERE stream=? ORDER BY block,log_index LIMIT 4097',args:[b.stream]})).rows.map(e=>({tx:e.tx,index:Number(e.log_index),block:Number(e.block),hash:e.block_hash,type:e.type,id:e.order_id,kind:e.kind,payload:JSON.parse(e.payload)}));
 const orders=(await db.execute({sql:'SELECT type,order_id,document FROM rift_exchange_orders WHERE stream=? ORDER BY type,order_id LIMIT 1025',args:[b.stream]})).rows.map(o=>({type:o.type,id:o.order_id,document:JSON.parse(o.document)}));
 const checkpoints=(await db.execute({sql:'SELECT block,hash FROM rift_exchange_checkpoints WHERE stream=? ORDER BY block LIMIT 33',args:[b.stream]})).rows.map(p=>({block:Number(p.block),hash:p.hash}));
 const data={schema,binding:{chainId:25,address:b.address,startBlock:b.startBlock,runtimeHash:b.runtimeHash},state,events,orders,checkpoints},snapshot={format:orders.length>512?'rift-exchange-snapshot-v2':'rift-exchange-snapshot-v1',data,digest:digest(data)};validate(snapshot);return snapshot;
 })}
/** Explicit import into an absent stream only. No live overwrite, lease restoration or migration. */
export async function restorePlatformSnapshot(store,snapshot){
 let b;try{b=validate(snapshot)}catch{throw new PlatformIndexError('INVALID_PLATFORM_SNAPSHOT')}
 const data=JSON.parse(JSON.stringify(snapshot.data)),schema=await store.assertSchema();demand(digest(schema)===digest(data.schema));
 return store._tx(async tx=>{
  for(const table of ['rift_exchange_streams','rift_exchange_events','rift_exchange_orders','rift_exchange_checkpoints']){const rows=(await tx.execute({sql:'SELECT 1 FROM '+table+' WHERE stream=? LIMIT 1',args:[b.stream]})).rows;if(rows.length)throw new PlatformIndexError('RESTORE_TARGET_STREAM_NOT_EMPTY')}
  const s=data.state;await tx.execute({sql:'INSERT INTO rift_exchange_streams(stream,chain,address,start_block,runtime_hash,last_block,block_hash,revision,updated) VALUES(?,?,?,?,?,?,?,?,?)',args:[b.stream,25,b.address,b.startBlock,b.runtimeHash,s.indexedThrough,s.blockHash,s.revision,s.updatedAt]});
  for(const e of data.events)await tx.execute({sql:'INSERT INTO rift_exchange_events VALUES(?,?,?,?,?,?,?,?,?)',args:[b.stream,e.tx,e.index,e.block,e.hash,e.type,e.id,e.kind,JSON.stringify(e.payload)]});
  for(const o of data.orders){const d=o.document;await tx.execute({sql:'INSERT INTO rift_exchange_orders VALUES(?,?,?,?,?,?,?,?)',args:[b.stream,o.type,o.id,d.seller||d.buyer,d.nft,BigInt(d.remaining)>0n?1:0,Number(d.expiry),JSON.stringify(d)]})}
  for(const p of data.checkpoints)await tx.execute({sql:'INSERT INTO rift_exchange_checkpoints VALUES(?,?,?)',args:[b.stream,p.block,p.hash]});
  return store._publicState(await store._state(tx,b));
 });
}
