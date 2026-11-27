import {randomUUID,createHash} from 'node:crypto';
import {preparePlatformRecovery} from './platform-exchange-recovery.js';
const schema=[
 `CREATE TABLE IF NOT EXISTS rift_recovery_schema(id INTEGER PRIMARY KEY CHECK(id=1),checksum TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS rift_recovery_intents(id TEXT PRIMARY KEY,stream TEXT NOT NULL,digest TEXT NOT NULL,document TEXT NOT NULL,phase TEXT NOT NULL CHECK(phase IN ('prepared','attempting','held','acknowledged')),observation TEXT,created INTEGER NOT NULL DEFAULT(unixepoch()))`,
 `CREATE UNIQUE INDEX IF NOT EXISTS rift_recovery_one_pending ON rift_recovery_intents(stream) WHERE phase!='acknowledged'`
];
const checksum=createHash('sha256').update(schema.join(';')).digest('hex');
export class JournalError extends Error{constructor(code){super(code);this.name='JournalError';this.code=code;}}
const demand=(ok,code)=>{if(!ok)throw new JournalError(code)};
function documentFor(binding,request){
 const b={chainId:binding?.chainId,address:binding?.address,startBlock:binding?.startBlock,runtimeHash:binding?.runtimeHash};
 const candidate=preparePlatformRecovery(b,request);
 const document={binding:{chainId:25,address:candidate.binding.address,startBlock:b.startBlock,runtimeHash:candidate.binding.runtimeHash},request:{expected:candidate.expected,toBlock:candidate.toBlock,blockHash:candidate.blockHash,logs:request.logs.map(l=>({address:l.address.toLowerCase(),blockNumber:l.blockNumber,index:l.index,blockHash:l.blockHash.toLowerCase(),transactionHash:l.transactionHash.toLowerCase(),data:l.data,topics:[...l.topics]})),...(request.denseBlock?{denseBlock:structuredClone(request.denseBlock)}:{}),...(request.rollbackTo?{rollbackTo:{block:request.rollbackTo.block,hash:request.rollbackTo.hash?.toLowerCase()??null}}:{})}};
 const text=JSON.stringify(document);demand(Buffer.byteLength(text)<=2097152,'JOURNAL_INTENT_BYTES_LIMIT');
 return {text,stream:candidate.binding.stream,digest:createHash('sha256').update(text).digest('hex')};
}
const publicRow=row=>({id:row.id,stream:row.stream,phase:row.phase,digest:row.digest,observation:row.observation,created:Number(row.created)});
/** Separate owned client. Explicit migration; no production auto-create, no implicit retry or deletion. */
export class PlatformRecoveryJournal{
 constructor(client){this.client=client;this.tail=Promise.resolve();this.closed=false;this.requiresReopen=false;}
 async _run(fn){demand(!this.closed,'JOURNAL_CLOSED');const job=this.tail.then(async()=>{demand(!this.requiresReopen,'JOURNAL_REOPEN_REQUIRED');try{return await fn()}catch(e){if(e instanceof JournalError)throw e;this.requiresReopen=true;throw new JournalError('JOURNAL_STORAGE_FAILED')}});this.tail=job.catch(()=>{});return job;}
 async _write(fn){return this._run(async()=>{let tx;try{tx=await this.client.transaction('write');const result=await fn(tx);await tx.commit();return result;}catch(e){try{await tx?.rollback()}catch{this.requiresReopen=true}throw e;}finally{tx?.close()}})}
 async _schema(db){const rows=(await db.execute('SELECT checksum FROM rift_recovery_schema WHERE id=1')).rows;demand(rows.length===1&&rows[0].checksum===checksum,'JOURNAL_SCHEMA_MISMATCH');}
 async initialize(){return this._write(async tx=>{await tx.execute(schema[0]);const rows=(await tx.execute('SELECT checksum FROM rift_recovery_schema')).rows;demand(rows.length===0||rows.length===1&&rows[0].checksum===checksum,'JOURNAL_SCHEMA_MISMATCH');for(const sql of schema.slice(1))await tx.execute(sql);await tx.execute({sql:'INSERT INTO rift_recovery_schema VALUES(1,?) ON CONFLICT(id) DO NOTHING',args:[checksum]});return {checksum}})}
 async assertSchema(){return this._run(()=>this._schema(this.client))}
 async prepare(binding,request){const doc=documentFor(binding,request),id=randomUUID();return this._write(async tx=>{await this._schema(tx);const pending=(await tx.execute({sql:"SELECT id FROM rift_recovery_intents WHERE stream=? AND phase!='acknowledged' LIMIT 1",args:[doc.stream]})).rows;demand(!pending.length,'RECOVERY_INTENT_PENDING');const usage=(await tx.execute('SELECT COUNT(*) n,COALESCE(SUM(length(CAST(document AS BLOB))),0) bytes FROM rift_recovery_intents')).rows[0];demand(Number(usage.n)<256&&Number(usage.bytes)+Buffer.byteLength(doc.text)<=8388608,'JOURNAL_CAPACITY_REVIEW_REQUIRED');await tx.execute({sql:"INSERT INTO rift_recovery_intents(id,stream,digest,document,phase) VALUES(?,?,?,?,'prepared')",args:[id,doc.stream,doc.digest,doc.text]});return {id,stream:doc.stream,digest:doc.digest,phase:'prepared'}})}
 async transition(id,from,to,observation=null){demand(typeof id==='string'&&/^[\da-f-]{36}$/.test(id),'INVALID_INTENT_ID');demand(from==='prepared'&&to==='attempting'||from==='attempting'&&['held','acknowledged'].includes(to)||from==='held'&&to==='held','INVALID_INTENT_TRANSITION');demand(observation===null||['committed','matching-publication-observed','unchanged-observed','conflicting-content-observed','changed-or-superseded','unresolved','semantic-failure'].includes(observation),'INVALID_INTENT_OBSERVATION');demand(to==='acknowledged'?observation==='committed':to==='attempting'?observation===null:observation!==null,'INVALID_INTENT_OBSERVATION');return this._write(async tx=>{await this._schema(tx);const result=await tx.execute({sql:'UPDATE rift_recovery_intents SET phase=?,observation=? WHERE id=? AND phase=?',args:[to,observation,id,from]});demand(result.rowsAffected===1,'INTENT_PHASE_CONFLICT');return {id,phase:to,observation}})}
 async pending(binding){const b=prepareBinding(binding);return this._run(async()=>{await this._schema(this.client);return (await this.client.execute({sql:"SELECT id,stream,digest,phase,observation,created FROM rift_recovery_intents WHERE stream=? AND phase!='acknowledged'",args:[b]})).rows.map(publicRow)})}
 async read(id){demand(typeof id==='string'&&/^[\da-f-]{36}$/.test(id),'INVALID_INTENT_ID');return this._run(async()=>{await this._schema(this.client);const row=(await this.client.execute({sql:'SELECT * FROM rift_recovery_intents WHERE id=?',args:[id]})).rows[0];demand(row,'INTENT_NOT_FOUND');demand(createHash('sha256').update(row.document).digest('hex')===row.digest,'INTENT_DIGEST_MISMATCH');const doc=JSON.parse(row.document);const verified=documentFor(doc.binding,doc.request);demand(verified.stream===row.stream&&verified.digest===row.digest,'INTENT_DOCUMENT_MISMATCH');return {...publicRow(row),...doc}})}
 async close(){this.closed=true;await this.tail;try{this.client.close()}catch{}}
}
import {platformExchangeBinding} from './platform-exchange-store.js';
function prepareBinding(b){return platformExchangeBinding(b).stream}

export {documentFor as canonicalJournalIntent};
