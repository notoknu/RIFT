import {backupReceiverHandler} from './backup-delivery-http.js';
const need=(v,c)=>{if(!v)throw Error(c)};
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(v);
const safe=n=>Number.isSafeInteger(n)&&n>=0;
/** Bounded overlapping transport credentials. Never contains wallet signing keys.
 * Retired rings finish admitted requests before best-effort key-buffer erasure. */
export function createBackupReceiverKeyring({store,target,credentials,timeoutMs=10000,now=Date.now,guard=()=>{},authorizeBody=()=>{}}={}){
 need(store&&id(target)&&Array.isArray(credentials)&&credentials.length>=1&&credentials.length<=3&&new Set(credentials.map(c=>c.keyId)).size===credentials.length&&typeof now==='function'&&Number.isInteger(timeoutMs)&&timeoutMs>=1&&timeoutMs<=60000,'INVALID_RECEIVER_KEYRING');need(typeof guard==='function'&&typeof authorizeBody==='function','INVALID_RECEIVER_GUARD');
 for(const c of credentials)need(id(c.keyId)&&Buffer.isBuffer(c.key)&&c.key.length===32&&safe(c.notBefore)&&safe(c.expiresAt)&&c.expiresAt>c.notBefore,'INVALID_RECEIVER_CREDENTIAL');
 let active=0,retired=false,wiped=false;const slots=new Map();const clock=()=>{const n=now();need(safe(n),'INVALID_RECEIVER_CLOCK');return n};const valid=c=>{const at=clock();return at>=c.notBefore&&at<c.expiresAt};
 for(const c of credentials){const slot={...c,key:Buffer.from(c.key)};slot.handler=backupReceiverHandler({store,target,keyId:c.keyId,key:slot.key,timeoutMs,authorizeBody,authorize:()=>{guard();need(valid(slot),'RECEIVER_CREDENTIAL_EXPIRED')}});slots.set(c.keyId,slot)}
 const erase=()=>{if(retired&&active===0&&!wiped){for(const slot of slots.values())slot.key.fill(0);wiped=true}};
 return {
  ready:()=>!retired&&[...slots.values()].some(valid),
  retire(){retired=true;erase()},
  async handle(req,res){guard();res.setHeader('Cache-Control','no-store');if(req.url!=='/v1/backups'||req.method!=='POST'){res.statusCode=404;res.end('{}');return}const slot=slots.get(req.headers['x-rift-key-id']);if(retired||active>=2||!slot||!valid(slot)){res.statusCode=retired||active>=2?503:403;res.end('{}');return}active++;try{await slot.handler(req,res)}finally{active--;erase()}},
  status:()=>({active,retired,erased:wiped,credentialIds:[...slots.keys()],scope:'Transport credential lifecycle only; no restore attestation'})
 };
}
