import {boundedBytes} from '../shared/creator-service.js';import {validateIPFS} from '../shared/metadata.js';
export async function edgeMetadata(uri){
 if(typeof uri!=='string'||uri.length>1048576)throw Error('Missing/oversized metadata URI');let text;
 if(uri.startsWith('data:application/json;base64,')){const raw=atob(uri.slice(29));text=new TextDecoder().decode(Uint8Array.from(raw,c=>c.charCodeAt(0)))}
 else{
  let target;if(uri.startsWith('ipfs://')){validateIPFS(uri);target='https://ipfs.io/ipfs/'+uri.slice(7).split('/').map(encodeURIComponent).join('/')}
  else{const url=new URL(uri);if(url.protocol!=='https:'||url.username||url.password||url.port||!['ipfs.io','gateway.pinata.cloud'].includes(url.hostname))throw Error('Metadata host not approved for edge egress');target=url.href}
  const r=await fetch(target,{redirect:'error',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Metadata gateway unavailable');text=new TextDecoder().decode(await boundedBytes(r,524288));
 }
 if(text.length>524288)throw Error('Metadata exceeds size budget');const meta=JSON.parse(text);if(!meta||typeof meta!=='object'||Array.isArray(meta))throw Error('Invalid collection metadata');return meta;
}
