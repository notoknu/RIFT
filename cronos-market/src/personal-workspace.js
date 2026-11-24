import {deviceWorkspace,validateDraft,validateWorkspaceBackup} from './device-workspace.js';
const clients=new WeakMap();
const MAX_MESSAGE=4*1024*1024;
export function validateLocalAccount(account){if(typeof account!=='string'||!/^25:(device|0x[a-f0-9]{40})$/.test(account))throw Error('Invalid local profile');return account}
/** One bounded serialized client per channel. Native failures never silently split state into IndexedDB. */
export function nativeWorkspace(bridge,{crypto=globalThis.crypto,timeout=90000}={}){
 if(clients.has(bridge))return clients.get(bridge);
 let tail=Promise.resolve(),queued=0;
 const call=(op,account,payload={})=>{
  validateLocalAccount(account);if(queued>=16)return Promise.reject(Error('Personal workspace queue is full'));queued++;
  const task=tail.then(()=>new Promise((resolve,reject)=>{
   let id,raw;try{id=crypto.randomUUID();raw=JSON.stringify({id,op,account,...payload});if(new TextEncoder().encode(raw).length>MAX_MESSAGE)throw Error('Workspace request exceeds 4 MiB')}catch(e){reject(e);return}
   const previous=bridge.onmessage;let timer;let settled=false;
   const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);if(bridge.onmessage===listener)bridge.onmessage=previous;error?reject(error):resolve(value)};
   const listener=event=>{let value;try{if(typeof event.data!=='string'||event.data.length>MAX_MESSAGE)throw Error();value=JSON.parse(event.data);if(!value||typeof value!=='object'||Array.isArray(value))throw Error()}catch{finish(Error('Invalid native workspace response'));return}if(value.id!==id)return;if(value.ok===false){finish(Error(value.error||'Native workspace request failed'));return}if(value.ok!==true||!Object.hasOwn(value,'result')){finish(Error('Invalid native workspace acknowledgement'));return}finish(null,value.result)};
   try{bridge.onmessage=listener;timer=setTimeout(()=>{finish(Error('Native workspace timed out. Reload before retrying; a mutation may already have committed.'));try{bridge.postMessage(JSON.stringify({id,op:'cancel'}))}catch{}},timeout);bridge.postMessage(raw)}catch{finish(Error('Native workspace channel unavailable; no browser fallback used'))}
  }));
  tail=task.catch(()=>{});return task.finally(()=>{queued--});
 };
 const api={kind:'native',list:account=>call('list',account),save:(account,title,document)=>{if(typeof title!=='string'||!title.trim()||title.length>120)throw Error('Enter a title up to 120 characters');return call('save',account,{title,document:validateDraft(document)})},remove:(account,id)=>{if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid draft ID');return call('remove',account,{draftId:id})},export:account=>call('export',account),import:(account,backup)=>{const validated=validateWorkspaceBackup(backup,account);return call('import',account,{backup:{format:'rift-personal-workspace',schema:1,chainId:25,account,...validated}})}};
 clients.set(bridge,api);return api;
}
export function personalWorkspace({window=globalThis.window,navigator=globalThis.navigator,...options}={}){
 if(window?.RiftLocal?.postMessage)return nativeWorkspace(window.RiftLocal,options);
 if(navigator?.userAgent?.includes('RIFTAndroid/')){const unavailable=()=>Promise.reject(Error('Native workspace unavailable. Update Android System WebView/app or use the website. No browser fallback was used.'));return {kind:'unavailable',list:unavailable,save:unavailable,remove:unavailable,export:unavailable,import:unavailable}}
 return {kind:'browser',...deviceWorkspace(options)};
}
