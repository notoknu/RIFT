import {validateMetadataDirectory} from './ipfs-preflight.js';
export async function metadataManifest(files,supply,{crypto=globalThis.crypto}={}){
 const validation=await validateMetadataDirectory(files,supply);if(!crypto?.subtle)throw Error('Secure SHA-256 is unavailable in this browser');
 const hex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
 const rows=[];for(const file of [...files].sort((a,b)=>a.name.localeCompare(b.name,'en',{numeric:true}))){const bytes=await file.arrayBuffer();rows.push({name:file.name,bytes:bytes.byteLength,sha256:hex(await crypto.subtle.digest('SHA-256',bytes))});}
 const bytes=new TextEncoder().encode(JSON.stringify(rows));return {version:1,supply,files:rows,totalBytes:validation.bytes,manifestSha256:hex(await crypto.subtle.digest('SHA-256',bytes)),scope:'Local exact-byte metadata manifest only. This hash is NOT an IPFS CID. Public retrieval, image bytes, ownership, rights and durable pinning are not verified.'};
}
