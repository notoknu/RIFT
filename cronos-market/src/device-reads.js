import {holdingsInput} from './holdings-check.js';
import {indexInput} from './discovery-index.js';
import {discoveryInput} from './transfer-discovery.js';
import {metadataEndpoint} from './metadata-reference.js';
const clients=new WeakMap();
const address=value=>{if(typeof value!=='string'||!/^0x[0-9a-f]{40}$/i.test(value))throw Error('Enter a valid public address');return value.toLowerCase()};
export function validateDeviceRead(op,input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid read fields');
 let fields,out={};switch(op){case 'holdings':return holdingsInput(input);case 'indexStatus':case 'indexStart':case 'indexResume':case 'indexDelete':return indexInput(op,input);case 'discover':return discoveryInput(input);case 'status':fields=[];break;case 'balance':fields=['owner','contract'];out={owner:address(input.owner),contract:input.contract?address(input.contract):''};break;case 'nft':case 'tokenUri':fields=op==='nft'?['owner','contract','tokenId','standard']:['contract','tokenId','standard','account'];if(op==='tokenUri'){if(typeof input.account!=='string'||!/^25:(device|0x[a-f0-9]{40})$/.test(input.account))throw Error('Invalid local profile');out.account=input.account}if(op==='nft')out.owner=address(input.owner);out.contract=address(input.contract);if(typeof input.tokenId!=='string'||!/^\d{1,78}$/.test(input.tokenId)||BigInt(input.tokenId)>=2n**256n)throw Error('Invalid uint256 token ID');out.tokenId=BigInt(input.tokenId).toString();if(!['ERC-721','ERC-1155'].includes(input.standard))throw Error('Choose ERC-721 or ERC-1155');out.standard=input.standard;break;case 'artwork':case 'metadata':case 'receipt':case 'observations':fields=['artwork','metadata'].includes(op)?['account','uri']:op==='receipt'?['account','hash']:['account'];if(typeof input.account!=='string'||!/^25:(device|0x[a-f0-9]{40})$/.test(input.account))throw Error('Invalid local profile');out.account=input.account;if(['artwork','metadata'].includes(op))out.uri=metadataEndpoint(input.uri);if(op==='receipt'){if(typeof input.hash!=='string'||!/^0x[0-9a-f]{64}$/i.test(input.hash))throw Error('Invalid transaction hash');out.hash=input.hash.toLowerCase()}break;default:throw Error('Unsupported device read')}
 if(Object.keys(input).some(k=>!fields.includes(k)))throw Error('Unsupported read field');return out;
}
export function deviceReadClient(bridge,{crypto=globalThis.crypto,timeout=125000}={}){
 if(clients.has(bridge))return clients.get(bridge);let tail=Promise.resolve(),queued=0;
 const read=(op,input={}, {signal}={})=>{const payload=validateDeviceRead(op,input);if(queued>=8)return Promise.reject(Error('Device read queue is full'));queued++;
  const task=tail.then(()=>new Promise((resolve,reject)=>{if(signal?.aborted){reject(Error('Device read cancelled'));return}const id=crypto.randomUUID(),previous=bridge.onmessage;let timer,done=false;
   const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);if(bridge.onmessage===listener)bridge.onmessage=previous;error?reject(error):resolve(value)};
   const cancel=()=>{try{bridge.postMessage(JSON.stringify({id,op:'cancel'}))}catch{}};
   const abort=()=>{finish(Error('Device read cancelled'));cancel()};
   const listener=event=>{let d;try{if(typeof event.data!=='string'||event.data.length>196608)throw Error();d=JSON.parse(event.data)}catch{finish(Error('Invalid device read response'));return}if(!d||typeof d!=='object'||Array.isArray(d)){finish(Error('Invalid device read response'));return}if(d.id!==id)return;if(d.ok===false){finish(Error(d.error||'Device read refused'));return}if(d.ok!==true||!d.result||typeof d.result!=='object'||Array.isArray(d.result)){finish(Error('Invalid device read acknowledgement'));return}finish(null,d.result)};
   try{bridge.onmessage=listener;signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>{finish(Error('Device read timed out; no transaction was sent'));cancel()},timeout);bridge.postMessage(JSON.stringify({id,op,...payload}))}catch{finish(Error('Device read channel unavailable; no web/API fallback was used'))}
  }));tail=task.catch(()=>{});return task.finally(()=>{queued--});
 };const client={read};clients.set(bridge,client);return client;
}
export function deviceReadCapability(window=globalThis.window,navigator=globalThis.navigator){return window?.RiftRead?.postMessage?'available':navigator?.userAgent?.includes('RIFTAndroid/')?'unavailable':'browser'}
