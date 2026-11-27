import https from 'node:https';import dns from 'node:dns/promises';
import {publicAddress} from './safe-fetch.js';
import {receiveBackup,DeliveryError} from './backup-delivery.js';
const need=(v,c)=>{if(!v)throw new DeliveryError(c)};
export function backupReceiverHandler({store,target,keyId,key,timeoutMs=10000,authorize=()=>{},authorizeBody=()=>{}}={}){
 need(store&&typeof target==='string'&&typeof keyId==='string'&&Buffer.isBuffer(key)&&key.length===32&&Number.isInteger(timeoutMs)&&timeoutMs>=1&&timeoutMs<=60000,'INVALID_RECEIVER_CONFIG');need(typeof authorize==='function'&&typeof authorizeBody==='function','INVALID_RECEIVER_AUTHORIZER');let active=0;
 return async(req,res)=>{
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  if(req.url!=='/v1/backups'||req.method!=='POST'){res.statusCode=404;res.end('{}');return}
  if(active>=2){res.statusCode=503;res.end('{}');return}active++;let timer;
  try{need(req.headers['content-type']==='application/octet-stream'&&/^\d+$/.test(req.headers['content-length']||''),'INVALID_BACKUP_BODY');const length=Number(req.headers['content-length']);need(length>=29&&length<=4194304,'INVALID_BACKUP_BODY');const chunks=[];let n=0;
   const body=await Promise.race([(async()=>{for await(const chunk of req){n+=chunk.length;need(n<=length,'INVALID_BACKUP_BODY');chunks.push(chunk)}need(n===length,'INVALID_BACKUP_BODY');return Buffer.concat(chunks)})(),new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new DeliveryError('RECEIVER_TIMEOUT'));req.destroy()},timeoutMs)})]);
   authorize();const ack=receiveBackup({store,target,keyId,key,authorize:authorizeBody,request:{body,target:req.headers['x-rift-target'],keyId:req.headers['x-rift-key-id'],digest:req.headers['x-rift-digest'],signature:req.headers['x-rift-signature']}});res.end(JSON.stringify(ack));
  }catch{if(!res.destroyed){res.statusCode=400;res.end('{"error":"BACKUP_NOT_ACCEPTED"}')}}finally{clearTimeout(timer);active--}
 };
}
export function createBackupHttpsSender({url,timeoutMs=10000,lookup=dns.lookup,request=https.request}={}){
 let target;try{target=new URL(url)}catch{throw new DeliveryError('INVALID_BACKUP_URL')}
 need(target.protocol==='https:'&&!target.username&&!target.password&&!target.search&&!target.hash&&(!target.port||target.port==='443')&&target.pathname==='/v1/backups','INVALID_BACKUP_URL');
 need(Number.isInteger(timeoutMs)&&timeoutMs>=1&&timeoutMs<=60000,'INVALID_BACKUP_TIMEOUT');
 return async(payload,{signal}={})=>{
  need(!signal?.aborted,'DELIVERY_CANCELLED');
  let timer;const started=Date.now();let addresses;
  try{addresses=await Promise.race([lookup(target.hostname.replace(/^\[|\]$/g,''),{all:true}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new DeliveryError('BACKUP_DNS_TIMEOUT')),timeoutMs)})])}finally{clearTimeout(timer)}
  need(Array.isArray(addresses)&&addresses.length>0&&addresses.length<=32&&addresses.every(a=>[4,6].includes(a.family)&&publicAddress(a.address)),'BACKUP_DESTINATION_BLOCKED');
  return new Promise((resolve,reject)=>{let req,done=false;const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);error?reject(new DeliveryError('DELIVERY_UNCERTAIN')):resolve(result)};
   try{req=request(target,{method:'POST',agent:false,signal,headers:{'Content-Type':'application/octet-stream','Content-Length':payload.body.length,'X-Rift-Target':payload.target,'X-Rift-Key-Id':payload.keyId,'X-Rift-Digest':payload.digest,'X-Rift-Signature':payload.signature},lookup:(_host,options,cb)=>options.all?cb(null,addresses):cb(null,addresses[0].address,addresses[0].family)},res=>{
    res.on('error',()=>finish(true));if(res.statusCode!==200||Number(res.headers['content-length']||0)>2048){res.destroy();finish(true);return}let size=0;const chunks=[];res.on('data',b=>{size+=b.length;if(size>2048){res.destroy();finish(true);return}chunks.push(b)});res.on('end',()=>{try{finish(false,JSON.parse(Buffer.concat(chunks)))}catch{finish(true)}});res.on('close',()=>{if(!res.complete)finish(true)})
   });req.on('error',()=>finish(true));timer=setTimeout(()=>{finish(true);req.destroy()},Math.max(1,timeoutMs-(Date.now()-started)));req.end(payload.body)}catch{finish(true)}
  });
 };
}
