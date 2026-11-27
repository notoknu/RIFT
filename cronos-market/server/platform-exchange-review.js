import {createHash} from 'node:crypto';
import {constants} from 'node:fs';
import {open} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {reconcilePlatformRange} from './platform-exchange-recovery.js';
import {canonicalJournalIntent,JournalError} from './platform-exchange-journal.js';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(canonical(v))).digest('hex');
const HEX=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9-]{36}$/;
export class ReviewError extends JournalError{constructor(code){super(code);this.name='ReviewError';this.code=code;}}
const demand=(ok,code)=>{if(!ok)throw new ReviewError(code)};
const schema=[
 `CREATE TABLE IF NOT EXISTS rift_recovery_review_schema(id INTEGER PRIMARY KEY CHECK(id=1),checksum TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS rift_recovery_reviews(intent_id TEXT PRIMARY KEY,document TEXT NOT NULL,digest TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS rift_recovery_archives(file_hash TEXT PRIMARY KEY,document TEXT NOT NULL)`
];
const checksum=hash(schema);
async function reviewSchema(db){const rows=(await db.execute('SELECT checksum FROM rift_recovery_review_schema WHERE id=1')).rows;demand(rows.length===1&&rows[0].checksum===checksum,'REVIEW_SCHEMA_MISMATCH')}
// Explicit supplemental schema; no change to the released exchange/journal v1 checksums.
export async function initializeRecoveryReview(journal){return journal._write(async tx=>{await journal._schema(tx);await tx.execute(schema[0]);const rows=(await tx.execute('SELECT checksum FROM rift_recovery_review_schema')).rows;demand(!rows.length||rows.length===1&&rows[0].checksum===checksum,'REVIEW_SCHEMA_MISMATCH');for(const sql of schema.slice(1))await tx.execute(sql);await tx.execute({sql:'INSERT INTO rift_recovery_review_schema VALUES(1,?) ON CONFLICT(id) DO NOTHING',args:[checksum]});return {checksum}})}
const approvalFor=(approval,confirm,commitment)=>{
 demand(approval&&approval.confirm===confirm&&approval.commitment===commitment&&typeof approval.reviewer==='string'&&/^[A-Za-z0-9:_-]{1,80}$/.test(approval.reviewer)&&HEX.test(approval.evidenceHash||''),'EXPLICIT_REVIEW_APPROVAL_REQUIRED');
 return {confirm,commitment,reviewer:approval.reviewer,evidenceHash:approval.evidenceHash};
};
export async function planMatchingIntentReview({journal,id,openFresh}){
 const intent=await journal.read(id);
 demand(['held','attempting'].includes(intent.phase),'INTENT_NOT_REVIEWABLE');
 const observation=await reconcilePlatformRange({binding:intent.binding,request:intent.request,failedStore:journal,openFresh});
 const data={version:1,id:intent.id,digest:intent.digest,phase:intent.phase,outcome:observation.outcome,state:observation.state??null,eligible:observation.outcome==='matching-publication-observed'};
 return {data,planHash:hash(data)};
}
/** Internal operator action, not authentication. Caller must establish authoritative primary and reviewer authorization. */
export async function acceptMatchingIntentReview({journal,plan,approval,openFresh}){
 demand(plan&&plan.planHash===hash(plan.data)&&plan.data?.eligible===true,'INVALID_REVIEW_PLAN');
 const approved=approvalFor(approval,'ACCEPT MATCHING PUBLICATION',plan.planHash);
 const fresh=await planMatchingIntentReview({journal,id:plan.data.id,openFresh});
 demand(fresh.data.eligible&&fresh.planHash===plan.planHash,'REVIEW_OBSERVATION_CHANGED');
 const document=JSON.stringify({plan:fresh,approval:approved,attribution:'Matching content accepted by explicit review; not proof of worker identity or independent chain canonicality'});
 demand(Buffer.byteLength(document)<=16384,'REVIEW_DOCUMENT_LIMIT');
 return journal._write(async tx=>{
  await journal._schema(tx);await reviewSchema(tx);
  const usage=(await tx.execute('SELECT COUNT(*) n,COALESCE(SUM(length(CAST(document AS BLOB))),0) bytes FROM rift_recovery_reviews')).rows[0];
  demand(Number(usage.n)<1024&&Number(usage.bytes)+Buffer.byteLength(document)<=1048576,'REVIEW_AUDIT_CAPACITY');
  const row=(await tx.execute({sql:'SELECT digest,phase FROM rift_recovery_intents WHERE id=?',args:[plan.data.id]})).rows[0];
  demand(row&&row.digest===plan.data.digest&&row.phase===plan.data.phase,'INTENT_REVIEW_CONFLICT');
  await tx.execute({sql:'INSERT INTO rift_recovery_reviews VALUES(?,?,?)',args:[plan.data.id,document,hash(document)]});
  const result=await tx.execute({sql:"UPDATE rift_recovery_intents SET phase='acknowledged',observation='reviewed-matching-publication' WHERE id=? AND digest=? AND phase=?",args:[plan.data.id,plan.data.digest,plan.data.phase]});
  demand(result.rowsAffected===1,'INTENT_REVIEW_CONFLICT');
  return {id:plan.data.id,phase:'acknowledged',observation:'reviewed-matching-publication',reviewHash:hash(document),replayed:false};
 });
}
function archiveRecord(row){
 demand(row&&row.phase==='acknowledged','ONLY_ACKNOWLEDGED_INTENTS_ARCHIVABLE');
 const parsed=JSON.parse(row.document),verified=canonicalJournalIntent(parsed.binding,parsed.request);
 demand(hash(row.document)===row.digest&&verified.digest===row.digest&&verified.stream===row.stream,'ARCHIVE_INTENT_INTEGRITY_FAILED');
 return {id:row.id,stream:row.stream,digest:row.digest,document:row.document,phase:row.phase,observation:row.observation,created:Number(row.created)};
}
function validateArchive(archive){
 demand(archive?.format==='rift-recovery-archive-v1'&&archive.digest===hash(archive.data)&&Array.isArray(archive.data?.records)&&archive.data.records.length>0&&archive.data.records.length<=64,'INVALID_JOURNAL_ARCHIVE');
 const ids=new Set();for(const entry of archive.data.records){demand(UUID.test(entry.intent?.id||'')&&!ids.has(entry.intent.id),'INVALID_JOURNAL_ARCHIVE');ids.add(entry.intent.id);archiveRecord(entry.intent);if(entry.review)demand(entry.review.intent_id===entry.intent.id&&hash(entry.review.document)===entry.review.digest,'INVALID_JOURNAL_ARCHIVE')}
 return archive;
}
export async function exportAcknowledgedIntents({journal,ids}){
 demand(Array.isArray(ids)&&ids.length>0&&ids.length<=64&&new Set(ids).size===ids.length&&ids.every(id=>UUID.test(id)),'INVALID_ARCHIVE_SELECTION');
 return journal._run(async()=>{let tx;try{
  tx=await journal.client.transaction('read');await journal._schema(tx);await reviewSchema(tx);
  const records=[];for(const id of [...ids].sort()){
   const row=(await tx.execute({sql:'SELECT * FROM rift_recovery_intents WHERE id=?',args:[id]})).rows[0];const intent=archiveRecord(row);
   const review=(await tx.execute({sql:'SELECT * FROM rift_recovery_reviews WHERE intent_id=?',args:[id]})).rows[0];records.push({intent,review:review?{intent_id:review.intent_id,document:review.document,digest:review.digest}:null});
  }
  const data={records},archive={format:'rift-recovery-archive-v1',data,digest:hash(data)};demand(Buffer.byteLength(JSON.stringify(archive))<=8388608,'JOURNAL_ARCHIVE_BYTES_LIMIT');validateArchive(archive);await tx.commit();return archive;
 }catch(e){try{await tx?.rollback()}catch{journal.requiresReopen=true}throw e}finally{tx?.close()}});
}
async function boundedRead(file,size){const buffer=Buffer.alloc(size+1);let offset=0;while(offset<buffer.length){const {bytesRead}=await file.read(buffer,offset,buffer.length-offset,null);if(!bytesRead)break;offset+=bytesRead}return buffer.subarray(0,offset)}
async function readArchiveReceipt(receipt){
 demand(receipt&&typeof receipt.path==='string'&&resolve(receipt.path)===receipt.path&&HEX.test(receipt.sha256||'')&&HEX.test(receipt.manifestDigest||''),'INVALID_ARCHIVE_RECEIPT');
 let file;try{file=await open(receipt.path,constants.O_RDONLY|constants.O_NOFOLLOW);const stat=await file.stat();demand(stat.isFile()&&stat.size>0&&stat.size<=8388608&&stat.size===receipt.bytes,'INVALID_ARCHIVE_RECEIPT');const bytes=await boundedRead(file,stat.size);demand(bytes.length===stat.size&&hash(bytes)===receipt.sha256,'ARCHIVE_FILE_CHANGED');const archive=validateArchive(JSON.parse(bytes.toString('utf8')));demand(archive.digest===receipt.manifestDigest&&archive.data.records.length===receipt.recordCount,'INVALID_ARCHIVE_RECEIPT');return archive;}catch(e){if(e instanceof ReviewError)throw e;throw new ReviewError('ARCHIVE_FILE_UNAVAILABLE')}finally{try{await file?.close()}catch{throw new ReviewError('ARCHIVE_CLOSE_FAILED')}}
}
/** Exclusive local file creation, fsync, directory fsync, then readback; not independent off-host backup acceptance. */
export async function writeAcknowledgedArchive({journal,ids,path}){
 demand(typeof path==='string'&&resolve(path)===path,'ABSOLUTE_ARCHIVE_PATH_REQUIRED');
 const archive=await exportAcknowledgedIntents({journal,ids}),bytes=Buffer.from(JSON.stringify(archive)+'\n');let file;
 try{file=await open(path,'wx',0o600);await file.writeFile(bytes);await file.sync();await file.close();file=null;const dir=await open(dirname(path),'r');try{await dir.sync()}finally{await dir.close()}}catch{throw new ReviewError('ARCHIVE_WRITE_FAILED_NO_PRUNE')}finally{try{await file?.close()}catch{throw new ReviewError('ARCHIVE_CLOSE_FAILED')}}
 const receipt={path,sha256:hash(bytes),manifestDigest:archive.digest,bytes:bytes.length,recordCount:ids.length};await readArchiveReceipt(receipt);return receipt;
}
/** Explicit archive/prune: acknowledged records only, matching verified file, atomic audit+delete. */
export async function pruneAcknowledgedArchive({journal,receipt,approval}){
 const approved=approvalFor(approval,'PRUNE VERIFIED ACKNOWLEDGED INTENTS',receipt?.sha256),archive=await readArchiveReceipt(receipt);
 const audit=JSON.stringify({fileHash:receipt.sha256,manifestDigest:receipt.manifestDigest,ids:archive.data.records.map(e=>e.intent.id),approval:approved,scope:'Verified local archive; off-host retention is a separate operator gate'});
 return journal._write(async tx=>{
  await journal._schema(tx);await reviewSchema(tx);
  const usage=(await tx.execute('SELECT COUNT(*) n,COALESCE(SUM(length(CAST(document AS BLOB))),0) bytes FROM rift_recovery_archives')).rows[0];
  demand(Number(usage.n)<256&&Number(usage.bytes)+Buffer.byteLength(audit)<=1048576,'ARCHIVE_AUDIT_CAPACITY');
  for(const entry of archive.data.records){const row=(await tx.execute({sql:'SELECT * FROM rift_recovery_intents WHERE id=?',args:[entry.intent.id]})).rows[0];demand(hash(archiveRecord(row))===hash(entry.intent),'ARCHIVE_DATABASE_CHANGED');const review=(await tx.execute({sql:'SELECT * FROM rift_recovery_reviews WHERE intent_id=?',args:[entry.intent.id]})).rows[0];demand(hash(review?{intent_id:review.intent_id,document:review.document,digest:review.digest}:null)===hash(entry.review),'ARCHIVE_DATABASE_CHANGED')}
  await tx.execute({sql:'INSERT INTO rift_recovery_archives VALUES(?,?)',args:[receipt.sha256,audit]});
  for(const entry of archive.data.records){const r=await tx.execute({sql:"DELETE FROM rift_recovery_intents WHERE id=? AND digest=? AND phase='acknowledged'",args:[entry.intent.id,entry.intent.digest]});demand(r.rowsAffected===1,'ARCHIVE_DATABASE_CHANGED')}
  return {archived:archive.data.records.length,fileHash:receipt.sha256,unresolvedDeleted:false,exchangeWrites:0};
 });
}
