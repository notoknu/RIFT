import {CID} from 'multiformats/cid';
const defaults=Object.freeze(['https://ipfs.io','https://gateway.pinata.cloud']);
const need=(v,c)=>{if(!v){const e=new Error(c);e.code=c;throw e}};
/** Presentation/preflight gateway selection, not trustless content verification. */
export function publicIpfsGatewayOrigins(env=(globalThis.process?.env||{})){
 const raw=env.RIFT_PUBLIC_IPFS_GATEWAYS;if(raw===undefined)return [...defaults];need(typeof raw==='string'&&raw.length>=2&&raw.length<=8192,'INVALID_PUBLIC_IPFS_GATEWAYS');let list;try{list=JSON.parse(raw)}catch{need(false,'INVALID_PUBLIC_IPFS_GATEWAYS')}
 need(Array.isArray(list)&&list.length>=1&&list.length<=5,'INVALID_PUBLIC_IPFS_GATEWAYS');const seen=new Set();return list.map(value=>{need(typeof value==='string'&&value.length<=2048,'INVALID_PUBLIC_IPFS_GATEWAY');let u;try{u=new URL(value)}catch{need(false,'INVALID_PUBLIC_IPFS_GATEWAY')}need(u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/'&&(!u.port||u.port==='443')&&!seen.has(u.origin),'INVALID_PUBLIC_IPFS_GATEWAY');seen.add(u.origin);return u.origin});
}
export function publicIpfsGatewayURLs(uri,{env=(globalThis.process?.env||{})}={}){
 need(typeof uri==='string'&&uri.length<=4096&&uri.startsWith('ipfs://'),'INVALID_PUBLIC_IPFS_URI');const [root,...parts]=uri.slice(7).split('/');try{CID.parse(root)}catch{need(false,'INVALID_PUBLIC_IPFS_CID')}
 const path=parts.map((part,index)=>{if(part===''&&index===parts.length-1)return '';need(part!=='','INVALID_PUBLIC_IPFS_PATH');let decoded;try{decoded=decodeURIComponent(part)}catch{need(false,'INVALID_PUBLIC_IPFS_PATH')}need(decoded!=='.'&&decoded!=='..'&&!/[\\/%?#\u0000-\u001f\u007f]/.test(decoded),'INVALID_PUBLIC_IPFS_PATH');return encodeURIComponent(decoded)}).join('/');const suffix=encodeURIComponent(root)+(parts.length?'/'+path:'');return publicIpfsGatewayOrigins(env).map(origin=>origin+'/ipfs/'+suffix);
}
