import https from 'node:https';
import dns from 'node:dns/promises';
import {publicAddress} from './safe-fetch.js';
let active=0;
/** Bounded public-provider GET/POST transport, pinned to vetted DNS answers.
 * No cookies, credentials, redirects, retries or arbitrary caller headers. */
export async function publicDataFetch(input,{method='GET',body,signal,maxBytes=2097152,timeoutMs=12000}={}){
 if(active>=12)throw Error('Public data reads busy');
 const url=new URL(input);if(url.protocol!=='https:'||url.username||url.password||url.port||url.href.length>8192||!['GET','POST'].includes(method)||method==='GET'&&body!==undefined||body!==undefined&&(typeof body!=='string'||Buffer.byteLength(body)>65536)||!Number.isSafeInteger(maxBytes)||maxBytes<128||maxBytes>5242880||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>25000)throw Error('Invalid public data request');
 active++;const deadline=Date.now()+timeoutMs;let timer;
 try{
  const answers=await Promise.race([dns.lookup(url.hostname,{all:true}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Provider DNS timeout')),timeoutMs)})]);clearTimeout(timer);
  if(signal?.aborted||!answers.length||answers.some(a=>!publicAddress(a.address)))throw Error('Public provider destination refused');
  return await new Promise((resolve,reject)=>{
   const request=https.request(url,{method,signal,headers:{Accept:'application/json,text/html;q=0.8',...(body!==undefined?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}:{})},lookup:(_host,options,cb)=>options.all?cb(null,answers):cb(null,answers[0].address,answers[0].family)},response=>{
    const status=response.statusCode||0;if(status<200||status>=300||status===204||status===205){response.destroy();reject(Error('Provider HTTP unavailable'));return}
    if(Number(response.headers['content-length']||0)>maxBytes){response.destroy();reject(Error('Provider response too large'));return}
    let size=0;const chunks=[];response.on('data',chunk=>{size+=chunk.length;if(size>maxBytes){response.destroy(Error('Provider response too large'));return}chunks.push(chunk)});response.on('error',reject);response.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status,headers:{'Content-Type':String(response.headers['content-type']||'application/octet-stream')}})));
   });
   const remaining=deadline-Date.now();if(remaining<=0){request.destroy();reject(Error('Provider deadline exceeded'));return}
   const timeout=setTimeout(()=>request.destroy(Error('Provider deadline exceeded')),remaining);request.on('close',()=>clearTimeout(timeout));request.on('error',reject);if(body!==undefined)request.write(body);request.end();
  });
 }finally{clearTimeout(timer);active--}
}
