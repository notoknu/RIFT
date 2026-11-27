import {realpath,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {VaultError,inspectRecoveryVault,verifyVaultArtifact,planVaultPublication,publishVaultArtifact} from './platform-recovery-vault.js';
import {recoveryHash} from './platform-unified-validation.js';
const HEX=/^[a-f0-9]{64}$/;
const need=(v,c)=>{if(!v)throw new VaultError(c)};
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const text=x=>JSON.stringify(canonical(x)),hash=x=>recoveryHash(text(x));
const check=signal=>need(!signal?.aborted,'VAULT_CANCELLED');
const reason=e=>/^[A-Z_]{1,80}$/.test(e?.code||'')?e.code:'VAULT_REPLICA_FAILED';
function config(opts){
 for(const side of [opts.sourceVault,opts.targetVault])need(side&&(side.expectedHead==='EMPTY'||HEX.test(side.expectedHead||'')),'VAULT_REPLICA_PINS_REQUIRED');
 need(typeof opts.resolveKey==='function','VAULT_AUDIT_KEY_RESOLVER_REQUIRED');
 const maxArtifacts=opts.maxArtifacts??8,maxBytes=opts.maxBytes??1073741824;
 need(Number.isSafeInteger(maxArtifacts)&&maxArtifacts>=1&&maxArtifacts<=32&&Number.isSafeInteger(maxBytes)&&maxBytes>=1&&maxBytes<=8589934592,'INVALID_VAULT_REPLICA_BUDGET');
 need(Array.isArray(opts.fileHashes)&&opts.fileHashes.length>=1&&opts.fileHashes.length<=maxArtifacts&&opts.fileHashes.every(h=>HEX.test(h))&&new Set(opts.fileHashes).size===opts.fileHashes.length,'VAULT_REPLICA_SELECTION_REQUIRED');
 return {maxArtifacts,maxBytes};
}
async function distinct(source,target){
 need(source.expectedVaultId!==target.expectedVaultId,'VAULT_REPLICA_DISTINCT_VAULTS_REQUIRED');
 need(Buffer.isBuffer(source.catalogKey)&&Buffer.isBuffer(target.catalogKey)&&!source.catalogKey.equals(target.catalogKey),'VAULT_REPLICA_DISTINCT_CATALOG_KEYS_REQUIRED');
 const [s,t,ss,ts]=await Promise.all([realpath(source.vault),realpath(target.vault),stat(source.vault),stat(target.vault)]);
 need(s!==t&&!(ss.dev===ts.dev&&ss.ino===ts.ino),'VAULT_REPLICA_DISTINCT_VAULTS_REQUIRED');
}
async function inventories(opts){
 const source=await inspectRecoveryVault(opts.sourceVault),target=await inspectRecoveryVault(opts.targetVault);
 await distinct(opts.sourceVault,opts.targetVault);
 for(const item of [source,target]){need(!item.writerLocked,'VAULT_WRITER_BUSY');need(!item.staleWorkDirectories&&!item.orphanObjects,'VAULT_REPLICA_HOUSEKEEPING_REQUIRED')}
 return {source,target};
}
async function withKey(opts,id,fn){let key;try{check(opts.signal);const original=await opts.resolveKey(id);check(opts.signal);need(Buffer.isBuffer(original)&&original.length===32,'VAULT_AUDIT_KEY_UNAVAILABLE');key=Buffer.from(original);need(!key.equals(opts.sourceVault.catalogKey)&&!key.equals(opts.targetVault.catalogKey),'VAULT_SEPARATE_KEYS_REQUIRED');return await fn(key)}finally{key?.fill(0)}}
/** Exact explicit artifact selection. No host independence, sync deletion, remote account provisioning or atomic multi-file transaction. */
export async function planVaultReplication(opts={}){
 const budget=config(opts);check(opts.signal);const {source,target}=await inventories(opts);
 const selected=opts.fileHashes.map(h=>source.entries.find(e=>e.fileHash===h));need(selected.every(Boolean),'VAULT_ARTIFACT_NOT_RECORDED');selected.sort((a,b)=>a.sequence-b.sequence);
 const bytes=selected.reduce((n,e)=>n+e.bytes,0);need(bytes<=budget.maxBytes,'VAULT_REPLICA_BYTE_BUDGET');
 const entries=[];
 for(const entry of selected){check(opts.signal);const existing=target.entries.find(e=>e.fileHash===entry.fileHash);
  await withKey(opts,entry.keyId,async key=>{
   await verifyVaultArtifact({...opts.sourceVault,key,keyId:entry.keyId,fileHash:entry.fileHash,workDir:opts.workDir,signal:opts.signal});
   if(existing)await verifyVaultArtifact({...opts.targetVault,key,keyId:entry.keyId,fileHash:entry.fileHash,workDir:opts.workDir,signal:opts.signal});
  });
  entries.push({fileHash:entry.fileHash,backupId:entry.backupId,keyId:entry.keyId,bytes:entry.bytes,schemaHash:entry.schemaHash,projectionCommitment:entry.projectionCommitment,action:existing?'verify-existing':'publish'});
 }
 need(target.sequence+entries.filter(e=>e.action==='publish').length<=256,'VAULT_RECEIPT_LIMIT_OR_NAME');
 await inventories(opts);check(opts.signal);
 const body={format:'rift-vault-replica-plan-v1',source:{vaultId:source.vaultId,head:source.head,catalogKeyId:source.catalogKeyId},target:{vaultId:target.vaultId,head:target.head,catalogKeyId:target.catalogKeyId},budget,selectedBytes:bytes,entries,automaticDeletion:false,scope:'Reviewed copies between distinct filesystem vaults; separate hosts/failure domains are not proven.'};return {...body,planHash:hash(body)};
}
/** A committed prefix is never rolled back. Any failure after execution begins returns explicit inspect-before-retry evidence. */
export async function executeVaultReplication(opts={}){
 const plan=opts.plan,a=opts.approval;
 need(plan&&a?.confirm==='REPLICATE REVIEWED VAULT ARTIFACTS'&&a.commitment===plan.planHash&&HEX.test(a.commitment||'')&&/^[A-Za-z0-9:_-]{1,80}$/.test(a.reviewer||'')&&HEX.test(a.evidenceHash||''),'VAULT_REPLICA_APPROVAL_REQUIRED');
 const fresh=await planVaultReplication(opts);need(text(plan)===text(fresh),'STALE_VAULT_REPLICA_PLAN');
 let targetHead=plan.target.head,inFlight=null;const completed=[];
 try{
  for(const entry of plan.entries){check(opts.signal);await inspectRecoveryVault(opts.sourceVault);
   const target={...opts.targetVault,expectedHead:targetHead};await inspectRecoveryVault(target);
   await withKey(opts,entry.keyId,async key=>{
    if(entry.action==='verify-existing'){
     await verifyVaultArtifact({...target,key,keyId:entry.keyId,fileHash:entry.fileHash,workDir:opts.workDir,signal:opts.signal});
     completed.push({fileHash:entry.fileHash,action:'verified-existing',head:targetHead});return;
    }
    const publication={...target,key,keyId:entry.keyId,source:join(opts.sourceVault.vault,'objects',entry.fileHash+'.riftbak'),workDir:opts.workDir,signal:opts.signal};
    const p=await planVaultPublication(publication);
    need(p.fileHash===entry.fileHash&&p.backupId===entry.backupId&&p.bytes===entry.bytes&&p.schemaHash===entry.schemaHash&&p.projectionCommitment===entry.projectionCommitment,'STALE_VAULT_REPLICA_PLAN');
    inFlight={fileHash:entry.fileHash,previousHead:targetHead};
    const receipt=await publishVaultArtifact({...publication,plan:p,approval:{confirm:'PUBLISH VERIFIED ENCRYPTED ARTIFACT',commitment:p.planHash,reviewer:a.reviewer,evidenceHash:a.evidenceHash}});
    targetHead=receipt.head;
    // Record known commit before optional readback: a failed readback must not turn it into "not written".
    const known={fileHash:entry.fileHash,action:'published',head:targetHead,readbackVerified:false};completed.push(known);inFlight=null;
    await verifyVaultArtifact({...target,expectedHead:targetHead,key,keyId:entry.keyId,fileHash:entry.fileHash,workDir:opts.workDir,signal:opts.signal});known.readbackVerified=true;
   });
  }
  await inspectRecoveryVault(opts.sourceVault);await inspectRecoveryVault({...opts.targetVault,expectedHead:targetHead});check(opts.signal);
  const body={format:'rift-vault-replica-result-v1',status:'verified',planHash:plan.planHash,source:plan.source,target:{...plan.target,head:targetHead},completed,automaticDeletion:false,automaticReplay:false,scope:'Selected encrypted copies verified locally; no off-host/WORM/retention/restore acceptance implied.'};return {...body,reportHash:hash(body)};
 }catch(e){const body={format:'rift-vault-replica-result-v1',status:'inspection-required',reasonCode:reason(e),planHash:plan.planHash,source:plan.source,target:{...plan.target,lastAcknowledgedHead:targetHead},completed,inFlight,committedPrefixRetained:true,automaticRetry:false,automaticDeletion:false,scope:'Inspect target catalog with independently trusted pins before replanning; in-flight publication may have committed.'};return {...body,reportHash:hash(body)}}
}
