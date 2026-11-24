import {normalizedDataImage} from '../shared/data-image.js';
import {validateIPFS} from '../shared/metadata.js';
import {publicAPIURL,configuredPublicAPI} from './public-hosting.js';
const gateways=['https://ipfs.io/ipfs/','https://gateway.pinata.cloud/ipfs/','https://dweb.link/ipfs/'];
export function artworkSources(src,origin=configuredPublicAPI){
 if(typeof src!=='string'||!src||src.length>700000)return [];
 if(src.startsWith('data:')){const safe=normalizedDataImage(src);return safe?[safe]:[];}
 if(src.startsWith('ipfs://')){
  try{validateIPFS(src);const path=src.slice(7).split('/').map(encodeURIComponent).join('/');return gateways.map(g=>g+path);}catch{return [];}
 }
 if(src.startsWith('/')&&!src.startsWith('//')&&!/[\\"<>\u0000-\u001f]/.test(src)){
  try{return [src.startsWith('/api/')?publicAPIURL(src,origin):src];}catch{return [];}
 }
 try{
  const u=new URL(src);if(u.protocol!=='https:'||u.username||u.password)return [];
  if(u.hostname==='images.minted.network'){
   const hash=u.searchParams.get('image');if(/^[a-f0-9]{64}$/.test(hash||''))return [publicAPIURL('/api/image?hash='+hash,origin)];
  }
  if(gateways.some(g=>u.href.startsWith(g))&&!u.search&&!u.hash){
   const uri='ipfs://'+decodeURIComponent(u.pathname.slice(6));
   return artworkSources(uri,origin);
  }
  return [u.href];
 }catch{return [];}
}
export function artworkCrossOrigin(url,origin=configuredPublicAPI){return origin&&typeof url==='string'&&url.startsWith(origin+'/api/')?'anonymous':undefined;}
