import https from 'node:https';import dns from 'node:dns/promises';import {createHmac,createHash} from 'node:crypto';
import {publicAddress} from './safe-fetch.js';import {VaultError} from './platform-recovery-vault.js';
const need=(v,c)=>{if(!v)throw new VaultError(c)},HEX=/^[a-f0-9]{64}$/;
function payload(event){need(event?.format==='rift-vault-monitor-event-v1'&&/^[a-f0-9-]{36}$/.test(event.vaultId||'')&&(event.head==='EMPTY'||HEX.test(event.head||''))&&HEX.test(event.reportHash||'')&&Number.isInteger(event.tick)&&event.tick>=1&&event.tick<=1000&&['verified','attention-required'].includes(event.status),'INVALID_VAULT_WEBHOOK_EVENT');const counts={};for(const k of ['recorded','verified','failed','unavailable','notChecked']){need(Number.isInteger(event.counts?.[k])&&event.counts[k]>=0&&event.counts[k]<=256,'INVALID_VAULT_WEBHOOK_EVENT');counts[k]=event.counts[k]}need(counts.recorded===counts.verified+counts.failed+counts.unavailable+counts.notChecked&&(event.status!=='verified'||counts.recorded>0&&counts.verified===counts.recorded),'INVALID_VAULT_WEBHOOK_EVENT');return {format:'rift-vault-notification-v1',vaultId:event.vaultId,head:event.head,reportHash:event.reportHash,tick:event.tick,status:event.status,counts}}
/** Optional direct public HTTPS notification. No redirects/retry, no private DNS, no caller-supplied secret payload.
 * Once a request is attempted every failure is delivery-uncertain; receiver acceptance is not human alert acceptance.
 */
export async function postVaultAuditWebhook({url,key,keyId,event,signal,timeoutMs=7000,lookup=dns.lookup,request=https.request}={}){
 need(Buffer.isBuffer(key)&&key.length===32&&typeof keyId==='string'&&/^[A-Za-z0-9:_-]{1,64}$/.test(keyId),'VAULT_WEBHOOK_KEY_REQUIRED');
 need(Number.isInteger(timeoutMs)&&timeoutMs>=1&&timeoutMs<=30000,'INVALID_VAULT_WEBHOOK_TIMEOUT');
 let target;try{target=new URL(url)}catch{throw new VaultError('INVALID_VAULT_WEBHOOK_URL')}
 need(target.protocol==='https:'&&!target.username&&!target.password&&!target.search&&!target.hash&&(!target.port||target.port==='443')&&target.href.length<=2048,'INVALID_VAULT_WEBHOOK_URL');
 const body=Buffer.from(JSON.stringify(payload(event))),eventId=createHash('sha256').update(body).digest('hex'),signature=createHmac('sha256',key).update(body).digest('hex');
 need(!signal?.aborted,'VAULT_WEBHOOK_NOT_SENT');const deadline=Date.now()+timeoutMs;let timer,onAbort,addresses;
 try{addresses=await Promise.race([Promise.resolve().then(()=>lookup(target.hostname.replace(/^\[|\]$/g,''),{all:true})),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new VaultError('VAULT_WEBHOOK_NOT_SENT')),timeoutMs);onAbort=()=>reject(new VaultError('VAULT_WEBHOOK_NOT_SENT'));signal?.addEventListener('abort',onAbort,{once:true});if(signal?.aborted)onAbort()})])}catch{throw new VaultError('VAULT_WEBHOOK_NOT_SENT')}finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort)}
 need(Array.isArray(addresses)&&addresses.length>=1&&addresses.length<=32&&addresses.every(a=>[4,6].includes(a.family)&&publicAddress(a.address)),'VAULT_WEBHOOK_DESTINATION_BLOCKED');
 need(!signal?.aborted&&Date.now()<deadline,'VAULT_WEBHOOK_NOT_SENT');
 return new Promise((resolve,reject)=>{
  let req,timer,abort,settled=false;
  const done=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(new VaultError('VAULT_WEBHOOK_DELIVERY_UNCERTAIN')):resolve(result)};
  const stop=()=>{done(true);try{req?.destroy()}catch{}};
  try{
   req=request(target,{method:'POST',agent:false,headers:{'Content-Type':'application/json','Content-Length':body.length,'X-Rift-Event-Id':eventId,'X-Rift-Key-Id':keyId,'X-Rift-Signature':'sha256='+signature},lookup:(_host,options,cb)=>options.all?cb(null,addresses):cb(null,addresses[0].address,addresses[0].family)},res=>{
    res.on('error',()=>done(true));if(!Number.isInteger(res.statusCode)||res.statusCode<200||res.statusCode>=300||Number(res.headers?.['content-length']||0)>1024){res.destroy();done(true);return}
    let n=0;const chunks=[];res.on('data',c=>{n+=c.length;if(n>1024){res.destroy();done(true);return}chunks.push(c)});
    res.on('end',()=>{if(settled)return;try{const ack=JSON.parse(Buffer.concat(chunks).toString('utf8'));need(ack.accepted===true&&ack.eventId===eventId,'ACK_REQUIRED');done(false,{acceptedByReceiver:true,eventId,humanAlertDeliveryVerified:false,automaticRetry:false})}catch{done(true)}});
    res.on('close',()=>{if(!res.complete)done(true)});
   });
   req.on('error',()=>done(true));abort=stop;signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(stop,Math.max(1,deadline-Date.now()));if(signal?.aborted){stop();return}req.end(body);
  }catch{stop()}
 });
}
