import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {open,lstat,realpath} from 'node:fs/promises';
import {isAbsolute,dirname,resolve} from 'node:path';
const need=(v,c)=>{if(!v){const e=new Error(c);e.code=c;throw e}};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(v);
const pin=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const SQL="CREATE TABLE lanes(id TEXT PRIMARY KEY,kind TEXT NOT NULL,fingerprint TEXT NOT NULL,version INTEGER NOT NULL,phase TEXT NOT NULL CHECK(phase IN ('ready','paused')),failures INTEGER NOT NULL,due INTEGER NOT NULL,token TEXT,until_at INTEGER NOT NULL,last_code TEXT NOT NULL,reviewer TEXT,evidence TEXT)";
/** Durable finite lane leases/backoff. No credential bytes, URLs or wallet keys stored. */
export async function openOperationsState(path,{create=false,now=Date.now}={}){
 need(isAbsolute(path||'')&&path===resolve(path)&&typeof now==='function','PRIVATE_OPERATIONS_STATE_REQUIRED');const parent=await lstat(dirname(path));need(parent.isDirectory()&&!parent.isSymbolicLink()&&(parent.mode&0o077)===0&&await realpath(dirname(path))===dirname(path),'PRIVATE_OPERATIONS_PARENT_REQUIRED');if(create){const f=await open(path,'wx',0o600);await f.close()}
 const stat=await lstat(path);need(stat.isFile()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0,'PRIVATE_OPERATIONS_STATE_REQUIRED');const db=new DatabaseSync(path);
 try{db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=1000;');if(create)db.exec(SQL+'; PRAGMA application_id=1380536147; PRAGMA user_version=1;');need(db.prepare('PRAGMA application_id').get().application_id===1380536147&&db.prepare('PRAGMA user_version').get().user_version===1,'OPERATIONS_SCHEMA_REQUIRED');const rows=db.prepare("SELECT sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").all();need(rows.length===1&&rows[0].sql===SQL&&Object.values(db.prepare('PRAGMA quick_check').get())[0]==='ok','OPERATIONS_SCHEMA_DRIFT')}catch(e){db.close();throw e}
 const clock=()=>{const n=now();need(safe(n),'OPERATIONS_CLOCK_INVALID');return n};
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r}catch(e){try{db.exec('ROLLBACK')}catch{}throw e}};
 const row=key=>db.prepare('SELECT * FROM lanes WHERE id=?').get(key);
 const current=c=>{const r=row(c?.id);need(r&&r.token===c.token&&r.version===c.version&&r.until_at>clock(),'OPERATIONS_LEASE_LOST');return r};
 return {
  enroll({id:lane,kind,fingerprint}){need(id(lane)&&['maintenance','delivery','retention'].includes(kind)&&pin(fingerprint),'INVALID_OPERATIONS_LANE');return tx(()=>{const old=row(lane);if(old){need(old.kind===kind&&old.fingerprint===fingerprint,'OPERATIONS_FINGERPRINT_CHANGED');return {id:lane,enrolled:false,phase:old.phase}}need(db.prepare('SELECT COUNT(*) n FROM lanes').get().n<64,'OPERATIONS_LANE_CAPACITY');db.prepare("INSERT INTO lanes VALUES(?,?,?,1,'ready',0,0,NULL,0,'ENROLLED',NULL,NULL)").run(lane,kind,fingerprint);return {id:lane,enrolled:true,activated:false}})},
  inspect:()=>db.prepare('SELECT id,kind,fingerprint,version,phase,failures,due,until_at,last_code,reviewer,evidence FROM lanes ORDER BY id').all().map(r=>({...r})),
  claim(lane,fingerprint,{leaseMs=180000}={}){need(id(lane)&&pin(fingerprint)&&Number.isInteger(leaseMs)&&leaseMs>=1000&&leaseMs<=1800000,'INVALID_OPERATIONS_CLAIM');return tx(()=>{const r=row(lane),at=clock();need(r&&r.fingerprint===fingerprint,'OPERATIONS_FINGERPRINT_CHANGED');if(r.phase!=='ready'||r.due>at||r.until_at>at)return null;const token=randomUUID();db.prepare('UPDATE lanes SET token=?,until_at=?,version=version+1 WHERE id=?').run(token,at+leaseMs,lane);return {id:lane,token,version:r.version+1}})},
  check:current,
  settle(claim,{success,code,intervalMs=60000,baseBackoffMs=5000,maxBackoffMs=3600000,maxFailures=8}={}){need(typeof success==='boolean'&&/^[A-Z0-9_]{1,80}$/.test(code||'')&&Number.isInteger(intervalMs)&&intervalMs>=1000&&intervalMs<=2592000000&&Number.isInteger(baseBackoffMs)&&baseBackoffMs>=1000&&Number.isInteger(maxBackoffMs)&&maxBackoffMs>=baseBackoffMs&&maxBackoffMs<=86400000&&Number.isInteger(maxFailures)&&maxFailures>=1&&maxFailures<=100,'INVALID_OPERATIONS_OUTCOME');return tx(()=>{const r=current(claim),failures=success?0:r.failures+1,paused=!success&&failures>=maxFailures,delay=success?intervalMs:Math.min(maxBackoffMs,baseBackoffMs*2**Math.min(20,failures-1));db.prepare('UPDATE lanes SET phase=?,failures=?,due=?,token=NULL,until_at=0,last_code=?,version=version+1 WHERE id=?').run(paused?'paused':'ready',failures,clock()+delay,code,r.id);return {id:r.id,phase:paused?'paused':'ready',failures,nextDue:clock()+delay,code}})},
  review(lane,{expectedVersion,fingerprint,reviewer,evidenceHash,confirm}={}){need(id(lane)&&safe(expectedVersion)&&pin(fingerprint)&&id(reviewer)&&pin(evidenceHash)&&confirm==='RESUME REVIEWED OPERATIONS LANE','OPERATIONS_REVIEW_REQUIRED');return tx(()=>{const r=row(lane);need(r&&r.version===expectedVersion&&r.until_at<=clock(),'STALE_OPERATIONS_REVIEW');db.prepare("UPDATE lanes SET fingerprint=?,phase='ready',failures=0,due=0,token=NULL,until_at=0,version=version+1,last_code='REVIEWED_RESUME',reviewer=?,evidence=? WHERE id=?").run(fingerprint,reviewer,evidenceHash,lane);return {id:lane,resumed:true,activated:false}})},
  close:()=>db.close()
 };
}
