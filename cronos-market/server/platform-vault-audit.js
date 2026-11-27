import {join} from 'node:path';
import {VaultError,inspectRecoveryVault,verifyVaultArtifact} from './platform-recovery-vault.js';
import {verifyUnifiedBackup,runUnifiedRecoveryDrill} from './platform-unified-recovery.js';
import {recoveryHash} from './platform-unified-validation.js';
const need=(v,c)=>{if(!v)throw new VaultError(c)},HEX=/^[a-f0-9]{64}$/;
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const commitment=x=>recoveryHash(JSON.stringify(canonical(x)));
const cancel=signal=>need(!signal?.aborted,'VAULT_CANCELLED');
const reason=e=>/^[A-Z_]{1,80}$/.test(e?.code||'')?e.code:'VAULT_AUDIT_CHECK_FAILED';
/** Read-only, serial, explicitly bounded readback. Key resolver owns its originals; only copies are cleared here.
 * Receipt identity/head are externally pinned. This is evidence of checks, not durable custody or restore acceptance.
 */
export async function auditRecoveryVault(opts={}){
 need(opts.expectedHead==='EMPTY'||HEX.test(opts.expectedHead||''),'VAULT_HEAD_PIN_REQUIRED');
 const maxArtifacts=opts.maxArtifacts??256,maxBytes=opts.maxBytes??1073741824;
 need(Number.isSafeInteger(maxArtifacts)&&maxArtifacts>=1&&maxArtifacts<=256&&Number.isSafeInteger(maxBytes)&&maxBytes>=1&&maxBytes<=68719476736,'INVALID_VAULT_AUDIT_BUDGET');
 need(typeof opts.resolveKey==='function','VAULT_AUDIT_KEY_RESOLVER_REQUIRED');cancel(opts.signal);
 const initial=await inspectRecoveryVault(opts),results=[];let attempted=0,attemptedBytes=0;
 for(const entry of initial.entries){
  cancel(opts.signal);
  const base={sequence:entry.sequence,fileHash:entry.fileHash,keyId:entry.keyId,bytes:entry.bytes};
  if(attempted>=maxArtifacts||entry.bytes>maxBytes-attemptedBytes){results.push({...base,status:'not-checked',reasonCode:'VAULT_AUDIT_BUDGET_EXHAUSTED'});continue}
  // Count all attempts, even missing-key or corrupted artifacts, so failure cannot bypass the budget.
  attempted++;attemptedBytes+=entry.bytes;let key;
  try{
   const resolved=await opts.resolveKey(entry.keyId);cancel(opts.signal);
   need(Buffer.isBuffer(resolved)&&resolved.length===32,'VAULT_AUDIT_KEY_UNAVAILABLE');key=Buffer.from(resolved);
   need(!key.equals(opts.catalogKey),'VAULT_SEPARATE_KEYS_REQUIRED');
   const verified=await verifyUnifiedBackup({source:join(opts.vault,'objects',entry.fileHash+'.riftbak'),key,keyId:entry.keyId,workDir:opts.workDir,signal:opts.signal});cancel(opts.signal);
   need(verified.fileHash===entry.fileHash&&verified.metadata.backupId===entry.backupId&&verified.metadata.keyId===entry.keyId&&verified.summary.schemaHash===entry.schemaHash&&commitment(verified.summary.checkpoints)===entry.projectionCommitment,'VAULT_OBJECT_EVIDENCE_MISMATCH');
   results.push({...base,status:'verified'});
  }catch(e){const code=reason(e);if(opts.signal?.aborted||['VAULT_CANCELLED','UNIFIED_CANCELLED'].includes(code))throw new VaultError('VAULT_CANCELLED');results.push({...base,status:code==='VAULT_AUDIT_KEY_UNAVAILABLE'?'unavailable':'failed',reasonCode:code})}
  finally{key?.fill(0)}
 }
 cancel(opts.signal);
 // Any observed concurrent catalog advance invalidates this pinned evidence rather than claiming a stable audit.
 const final=await inspectRecoveryVault(opts);cancel(opts.signal);
 need(final.head===initial.head&&final.sequence===initial.sequence,'VAULT_AUDIT_INVENTORY_CHANGED');
 const counts={recorded:results.length,verified:results.filter(r=>r.status==='verified').length,failed:results.filter(r=>r.status==='failed').length,unavailable:results.filter(r=>r.status==='unavailable').length,notChecked:results.filter(r=>r.status==='not-checked').length};
 const issues=[];
 if(!counts.recorded)issues.push('VAULT_AUDIT_EMPTY');
 if(counts.failed)issues.push('VAULT_AUDIT_ARTIFACT_FAILURE');
 if(counts.unavailable)issues.push('VAULT_AUDIT_KEYS_UNAVAILABLE');
 if(counts.notChecked)issues.push('VAULT_AUDIT_BUDGET_EXHAUSTED');
 if(initial.writerLocked||final.writerLocked)issues.push('VAULT_WRITER_BUSY');
 if(initial.orphanObjects||final.orphanObjects)issues.push('VAULT_AUDIT_ORPHAN_OBJECTS');
 if(initial.staleWorkDirectories||final.staleWorkDirectories)issues.push('VAULT_AUDIT_STALE_WORK');
 const body={format:'rift-vault-audit-v1',vaultId:initial.vaultId,head:initial.head,catalogKeyId:initial.catalogKeyId,status:issues.length?'attention-required':'verified',counts,budget:{maxArtifacts,maxBytes,attempted,attemptedBytes},issues,results,automaticDeletion:false,scope:'Serial local/mounted-copy readback against pinned catalog. Not a snapshot, signed attestation, off-host/restore acceptance, hard I/O quota or freshness proof.'};
 return {...body,reportHash:commitment(body)};
}

/** Reviewed ephemeral restore drill from an exact authenticated vault entry. No live activation. */
export async function drillRecoveryVaultArtifact(opts={}){
 need(opts.approval?.confirm==='RUN ISOLATED VAULT RECOVERY DRILL'&&opts.approval.fileHash===opts.fileHash&&HEX.test(opts.fileHash||'')&&/^[A-Za-z0-9:_-]{1,80}$/.test(opts.approval.reviewer||'')&&HEX.test(opts.approval.evidenceHash||''),'VAULT_DRILL_APPROVAL_REQUIRED');
 cancel(opts.signal);
 const selected=await verifyVaultArtifact(opts);
 const drill=await runUnifiedRecoveryDrill({source:join(opts.vault,'objects',opts.fileHash+'.riftbak'),key:opts.key,keyId:opts.keyId,workDir:opts.workDir,signal:opts.signal,approval:{...opts.approval,confirm:'RUN ISOLATED RECOVERY DRILL'}});
 cancel(opts.signal);await inspectRecoveryVault(opts);
 need(drill.fileHash===selected.fileHash&&drill.backupId===selected.backupId,'VAULT_OBJECT_EVIDENCE_MISMATCH');
 const body={format:'rift-vault-drill-v1',vaultId:selected.vaultId,head:selected.head,fileHash:selected.fileHash,drill,automaticReplay:false,activated:false,scope:'Local ephemeral restore from a pinned vault entry; not off-host independence or production/device acceptance.'};return {...body,reportHash:commitment(body)};
}
