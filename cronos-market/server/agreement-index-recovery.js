import {DatabaseSync} from 'node:sqlite';
import {lstat} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {openAgreementAudit} from './chain-agreement-audit.js';
import {restoreColdSnapshot} from './cold-snapshot-recovery.js';
const need=(v,c)=>{if(!v){const e=new Error(c);e.code=c;throw e}};
const head=v=>v==='EMPTY'||typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export async function inspectAgreementImage(path,{expectedAuditHead,expectedAuditCount}={}){
 need(isAbsolute(path||''),'ABSOLUTE_AGREEMENT_IMAGE_REQUIRED');const s=await lstat(path);need(s.isFile()&&!s.isSymbolicLink()&&(s.mode&0o077)===0&&s.size<=33554432,'PRIVATE_BOUNDED_AGREEMENT_IMAGE_REQUIRED');const db=new DatabaseSync(path,{readOnly:true});try{const rows=db.prepare('PRAGMA integrity_check').all();need(rows.length===1&&Object.values(rows[0])[0]==='ok','AGREEMENT_IMAGE_INTEGRITY')}finally{db.close()}
 const audit=await openAgreementAudit(path,{readOnly:true});try{const result=audit.inspect({expectedHead:expectedAuditHead,expectedCount:expectedAuditCount});return {...result,kind:'agreement-audit',scope:'Schema-bound local agreement hash chain; external latest head/count and independent custody required for truncation or rewritten-history detection'}}finally{audit.close()}
}
export async function restoreAgreementIndex(options={}){const {expectedAuditHead,expectedAuditCount,...recovery}=options;need(head(expectedAuditHead)&&Number.isSafeInteger(expectedAuditCount)&&expectedAuditCount>=0&&expectedAuditCount<=4096&&(expectedAuditCount===0?expectedAuditHead==='EMPTY':expectedAuditHead!=='EMPTY'),'PINNED_AGREEMENT_ANCHOR_REQUIRED');return restoreColdSnapshot(recovery,{kind:'agreement-audit',inspect:path=>inspectAgreementImage(path,{expectedAuditHead,expectedAuditCount})})}
