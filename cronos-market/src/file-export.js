// One export surface for browsers and Android's origin-scoped, export-only channel.
export const NATIVE_EXPORT_MAX=8*1024*1024,EXPORT_CHUNK_BYTES=24576;
const TYPES={json:'application/json',zip:'application/zip',txt:'text/plain',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif'};
export function exportMime(name){if(typeof name!=='string'||name.length>120||!/^[A-Za-z0-9][A-Za-z0-9._ -]*$/.test(name)||name.includes('..'))throw Error('Use a simple data filename up to 120 characters');const type=TYPES[name.split('.').at(-1).toLowerCase()];if(!type)throw Error('Unsupported data-file extension');return type}
let active=false;
export async function nativeExport(blob,name,bridge,{crypto=globalThis.crypto,timeout=190000}={}){
 if(active)throw Error('Another Android export is active');if(blob.size>NATIVE_EXPORT_MAX)throw Error('Android exports are limited to 8 MiB. Use the website for larger packs.');const mime=exportMime(name);const id=crypto.randomUUID();active=true;let token,waiting,previous=bridge.onmessage;
 const listener=event=>{let data;try{data=JSON.parse(event.data);if(!data||typeof data!=='object'||Array.isArray(data))return}catch{return}if(data.id!==id||!waiting)return;if(data.status==='error'){waiting.reject(Error(data.error||'Android export failed'));return}if(data.status!==waiting.status||data.status==='chunk'&&data.seq!==waiting.seq){waiting.reject(Error('Unexpected Android export acknowledgement'));return}waiting.resolve(data)};
 const send=(payload,status,seq,waitMs=timeout)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{waiting=null;reject(Error('Android export timed out; check the destination for an empty/partial file'))},waitMs);const settle=fn=>value=>{clearTimeout(timer);waiting=null;fn(value)};waiting={status,seq,resolve:settle(resolve),reject:settle(reject)};try{bridge.postMessage(JSON.stringify({id,...payload}))}catch{waiting?.reject(Error('Android export channel unavailable'))}});
 try{
  bridge.onmessage=listener;
  const bytes=new Uint8Array(await blob.arrayBuffer()),digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),sha256=[...digest].map(b=>b.toString(16).padStart(2,'0')).join('');
  const ready=await send({op:'begin',name,mime,size:bytes.length,sha256},'ready');if(typeof ready.token!=='string'||!/^[a-f0-9-]{36}$/.test(ready.token))throw Error('Invalid native export token');token=ready.token;
  for(let offset=0,seq=0;offset<bytes.length;offset+=EXPORT_CHUNK_BYTES,seq++){const chunk=bytes.subarray(offset,offset+EXPORT_CHUNK_BYTES),data=btoa(String.fromCharCode(...chunk));await send({op:'chunk',token,seq,data},'chunk',seq,30000)}
  await send({op:'end',token},'done',undefined,60000);return {transport:'android',status:'saved'};
 }catch(e){try{bridge.postMessage(JSON.stringify({id,op:'cancel',token}))}catch{}throw e}finally{if(bridge.onmessage===listener)bridge.onmessage=previous;active=false}
}
export async function downloadFile(data,name,type=exportMime(name),{window=globalThis.window,navigator=globalThis.navigator}={}){
 const expected=exportMime(name);if(type!==expected)throw Error('File extension and MIME must match');const blob=data instanceof Blob?new Blob([data],{type}):new Blob([data],{type});
 if(window?.RiftFiles?.postMessage)return nativeExport(blob,name,window.RiftFiles);
 if(navigator?.userAgent?.includes('RIFTAndroid/'))throw Error('This Android WebView lacks secure file export support. Update Android System WebView or use the website.');
 const url=URL.createObjectURL(blob),link=window.document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);return {transport:'browser',status:'download-requested'};
}
