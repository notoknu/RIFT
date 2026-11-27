import {CANDIDATE_COMPLETE_BLOCK} from './candidate-block-profile.js';
import {createHash} from 'node:crypto';
import {StageError} from './platform-exchange-stage.js';
import {canonicalJournalIntent} from './platform-exchange-journal.js';
import {reconcilePlatformRange} from './platform-exchange-recovery.js';
const sha=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const schema=[
 'CREATE TABLE IF NOT EXISTS rift_stage_review_schema(id INTEGER PRIMARY KEY CHECK(id=1),checksum TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS rift_stage_reviews(stage_id TEXT PRIMARY KEY,document TEXT NOT NULL,digest TEXT NOT NULL)'
],checksum=sha(schema.join(';'));
const need=(ok,code)=>{if(!ok)throw new StageError(code)};
async function assertSchema(db){const r=(await db.execute('SELECT checksum FROM rift_stage_review_schema WHERE id=1')).rows;need(r.length===1&&r[0].checksum===checksum,'STAGE_REVIEW_SCHEMA_MISMATCH')}
export async function initializeStageReview(stages){return stages._write(async tx=>{await stages._schema(tx);await tx.execute(schema[0]);const r=(await tx.execute('SELECT checksum FROM rift_stage_review_schema')).rows;need(!r.length||r.length===1&&r[0].checksum===checksum,'STAGE_REVIEW_SCHEMA_MISMATCH');await tx.execute(schema[1]);await tx.execute({sql:'INSERT INTO rift_stage_review_schema VALUES(1,?) ON CONFLICT(id) DO NOTHING',args:[checksum]});return {checksum}})}
async function observation({stages,journal,id,intentId,openFresh}){
 need(typeof openFresh==='function'&&journal?.client&&stages.client!==journal.client,'INDEPENDENT_STAGE_REVIEW_CLIENTS_REQUIRED');await stages.assertSchema();await stages._run(()=>assertSchema(stages.client));await journal.assertSchema();
 const s=await stages.read(id);need(['held','publishing'].includes(s.phase),'STAGE_NOT_REVIEWABLE');need(s.data.cursor===s.data.transactions.length,'STAGE_NOT_COMPLETE');
 const intent=await journal.read(intentId);need(intent.phase==='acknowledged'&&['committed','reviewed-matching-publication'].includes(intent.observation),'STAGE_INTENT_NOT_ACKNOWLEDGED');
 need(s.data.logs.length<=512||s.data.profile===CANDIDATE_COMPLETE_BLOCK,'INVALID_STAGE_PROFILE');const request={expected:s.data.expected,toBlock:s.data.block.number,blockHash:s.data.block.hash,logs:s.data.logs,...(s.data.logs.length>512?{denseBlock:intent.request.denseBlock}:{})},canonical=canonicalJournalIntent(s.data.binding,request);need(intent.stream===canonical.stream&&intent.digest===canonical.digest,'STAGE_INTENT_MISMATCH');need(!(await journal.pending(s.data.binding)).length,'RECOVERY_INTENT_PENDING');
 const seen=await reconcilePlatformRange({binding:s.data.binding,request,openFresh});need(seen.outcome==='matching-publication-observed','STAGE_PUBLICATION_NOT_EXACT');
 const body={version:1,stageId:s.id,stageVersion:s.version,stagePhase:s.phase,stageDigest:sha(JSON.stringify(s.data)),intentId:intent.id,intentDigest:intent.digest,intentObservation:intent.observation,state:seen.state};return {...body,planHash:sha(body)};
}
/** Read-only evidence commitment. Not authentication or independent consensus. */
export async function planPublishedStageReview(options){return observation(options)}
/** Reviewed marker closure only; no exchange writes, no intent replay or deletion. */
export async function acceptPublishedStageReview({stages,journal,plan,approval,openFresh}={}){
 need(plan&&approval?.confirm==='CLOSE VERIFIED PUBLISHED STAGE'&&approval.commitment===plan.planHash&&typeof approval.reviewer==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(approval.reviewer)&&/^[a-f0-9]{64}$/.test(approval.evidenceHash||''),'INVALID_STAGE_REVIEW_APPROVAL');
 const options={stages,journal,id:plan.stageId,intentId:plan.intentId,openFresh},fresh=await observation(options);need(JSON.stringify(fresh)===JSON.stringify(plan),'STALE_STAGE_REVIEW_PLAN');
 const audit={plan:fresh,approval:{confirm:approval.confirm,commitment:approval.commitment,reviewer:approval.reviewer,evidenceHash:approval.evidenceHash}},document=JSON.stringify(audit);need(Buffer.byteLength(document)<=16384,'STAGE_REVIEW_BYTES_LIMIT');
 return stages._write(async tx=>{
  await stages._schema(tx);await assertSchema(tx);
  const row=(await tx.execute({sql:'SELECT version,phase,digest FROM rift_receipt_stages WHERE id=?',args:[plan.stageId]})).rows[0];need(row&&Number(row.version)===plan.stageVersion&&row.phase===plan.stagePhase&&row.digest===plan.stageDigest,'STALE_STAGE_REVIEW_PLAN');
  // Repeat exact authoritative observation while holding the marker write transaction. No cross-store atomicity claimed.
  const intent=await journal.read(plan.intentId);need(intent.phase==='acknowledged'&&intent.digest===plan.intentDigest&&intent.observation===plan.intentObservation,'STALE_STAGE_REVIEW_PLAN');need(!(await journal.pending(intent.binding)).length,'RECOVERY_INTENT_PENDING');
  const seen=await reconcilePlatformRange({binding:intent.binding,request:intent.request,openFresh});need(seen.outcome==='matching-publication-observed'&&JSON.stringify(seen.state)===JSON.stringify(plan.state),'STALE_STAGE_REVIEW_PLAN');
  const usage=(await tx.execute('SELECT COUNT(*) n,COALESCE(SUM(length(CAST(document AS BLOB))),0) bytes FROM rift_stage_reviews')).rows[0];need(Number(usage.n)<256&&Number(usage.bytes)+Buffer.byteLength(document)<=1048576,'STAGE_REVIEW_CAPACITY_REQUIRED');need(plan.stageVersion<Number.MAX_SAFE_INTEGER,'STAGE_VERSION_EXHAUSTED');
  await tx.execute({sql:'INSERT INTO rift_stage_reviews VALUES(?,?,?)',args:[plan.stageId,document,sha(document)]});const changed=await tx.execute({sql:"UPDATE rift_receipt_stages SET phase='published',version=version+1 WHERE id=? AND version=? AND phase=?",args:[plan.stageId,plan.stageVersion,plan.stagePhase]});need(changed.rowsAffected===1,'STALE_STAGE_REVIEW_PLAN');return {stageId:plan.stageId,phase:'published',observation:'reviewed-exact-publication',automaticReplay:false};
 });
}
export async function inspectStageReviews(stages){return stages._run(async()=>{await assertSchema(stages.client);const rows=(await stages.client.execute('SELECT * FROM rift_stage_reviews ORDER BY stage_id LIMIT 257')).rows;need(rows.length<=256,'STAGE_REVIEW_CAPACITY_REQUIRED');return rows.map(r=>{need(sha(r.document)===r.digest,'STAGE_REVIEW_DIGEST_MISMATCH');return {stageId:r.stage_id,...JSON.parse(r.document)}})})}
