import {VaultError} from './platform-recovery-vault.js';import {recoveryHash} from './platform-unified-validation.js';
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const hash=x=>recoveryHash(JSON.stringify(canonical(x)));
const need=(v,c)=>{if(!v)throw new VaultError(c)},HEX=/^[a-f0-9]{64}$/;
const code=e=>/^[A-Z_]{1,80}$/.test(e?.code||'')?e.code:'VAULT_MONITOR_FAILED';
/** Checks self-consistency only; report hashes are not signatures or freshness/identity evidence. */
export function validateVaultAuditReport(report,{expectedVaultId,expectedHead}={}){
 need(report&&report.format==='rift-vault-audit-v1'&&HEX.test(report.reportHash||''),'INVALID_VAULT_AUDIT_REPORT');const {reportHash,...body}=report;need(hash(body)===reportHash,'VAULT_AUDIT_REPORT_HASH_MISMATCH');
 need(report.vaultId===expectedVaultId&&report.head===expectedHead,'VAULT_AUDIT_REPORT_PIN_MISMATCH');
 need(Array.isArray(report.results)&&report.results.length<=256&&Array.isArray(report.issues)&&report.issues.length<=16&&report.issues.every(v=>/^[A-Z_]{1,80}$/.test(v)),'INVALID_VAULT_AUDIT_REPORT');
 const counts={recorded:report.results.length,verified:0,failed:0,unavailable:0,notChecked:0},seen=new Set();
 for(const r of report.results){need(r&&HEX.test(r.fileHash||'')&&!seen.has(r.fileHash)&&['verified','failed','unavailable','not-checked'].includes(r.status),'INVALID_VAULT_AUDIT_REPORT');seen.add(r.fileHash);counts[r.status==='not-checked'?'notChecked':r.status]++}
 need(Object.keys(counts).every(k=>report.counts?.[k]===counts[k]),'VAULT_AUDIT_REPORT_COUNTS_MISMATCH');
 const verified=counts.recorded>0&&counts.verified===counts.recorded&&report.issues.length===0;
 need(report.status===(verified?'verified':'attention-required')&&report.automaticDeletion===false,'VAULT_AUDIT_REPORT_STATUS_MISMATCH');return {status:report.status,reportHash,counts};
}
const wait=(ms,signal)=>new Promise(resolve=>{if(signal.aborted)return resolve();const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',done);resolve()},timer=setTimeout(done,ms);signal.addEventListener('abort',done,{once:true})});
/** Bounded read-only foreground loop. Sink acknowledgments are awaited, never assumed to be external alert delivery. */
export async function monitorRecoveryVault({audit,onEvent,expectedVaultId,expectedHead,maxTicks=1,intervalMs=1000,maxRunMs=300000,signal}={}){
 need(typeof audit==='function'&&typeof onEvent==='function'&&/^[a-f0-9-]{36}$/.test(expectedVaultId||'')&&(expectedHead==='EMPTY'||HEX.test(expectedHead||''))&&Number.isInteger(maxTicks)&&maxTicks>=1&&maxTicks<=1000&&Number.isInteger(intervalMs)&&intervalMs>=100&&intervalMs<=60000&&Number.isInteger(maxRunMs)&&maxRunMs>=1&&maxRunMs<=3600000,'INVALID_VAULT_MONITOR_OPTIONS');
 const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();const timer=setTimeout(abort,maxRunMs);
 let ticks=0,acknowledged=0,lastReportHash=null,phase='audit';
 const result=(status,reasonCode)=>({format:'rift-vault-monitor-v1',status,...(reasonCode?{reasonCode}:{}),ticks,acknowledged,lastReportHash,automaticRepair:false,automaticReplay:false,scope:'Bounded foreground local audit monitoring; sink acknowledgment is not external alert delivery or installed service acceptance.'});
 try{
  while(ticks<maxTicks){
   if(controller.signal.aborted)return result('cancelled','VAULT_CANCELLED');phase='audit';ticks++;
   const report=await audit({signal:controller.signal});if(controller.signal.aborted)return result('cancelled','VAULT_CANCELLED');
   const summary=validateVaultAuditReport(report,{expectedVaultId,expectedHead});lastReportHash=summary.reportHash;
   phase='sink';await onEvent({format:'rift-vault-monitor-event-v1',tick:ticks,vaultId:expectedVaultId,head:expectedHead,...summary,scope:'Local checked report summary only; independent custody/alert acceptance not implied.'},{signal:controller.signal});acknowledged++;
   if(controller.signal.aborted)return result('cancelled','VAULT_CANCELLED');
   if(summary.status!=='verified')return result('blocked','VAULT_AUDIT_ATTENTION_REQUIRED');
   if(ticks<maxTicks)await wait(intervalMs,controller.signal);
  }
  return result('completed');
 }catch(e){if(phase==='audit'&&controller.signal.aborted)return result('cancelled','VAULT_CANCELLED');return result('blocked',phase==='sink'?'VAULT_MONITOR_SINK_UNCERTAIN':code(e))}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}
