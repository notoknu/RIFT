import {validateIPFS,validateTraits} from './metadata.js';
export function estimateIPFS({count,imageBytes,brandingFiles=3}){
 if(!Number.isSafeInteger(count)||count<1||!Number.isFinite(imageBytes)||imageBytes<0)throw Error('Invalid storage estimate');
 const logicalFiles=count*2+brandingFiles;
 return {logicalFiles,imageBytes,within500LogicalFiles:logicalFiles<=500,within1GBImages:imageBytes<=1_000_000_000,note:'Planning estimate only. Provider folder/DAG accounting, JSON/branding bytes, requests and bandwidth require account verification. No automatic upload or permanent-free guarantee.'};
}
export async function validateMetadataDirectory(files,supply){
 if(!Number.isInteger(supply)||supply<1||supply>100000)throw Error('Invalid supply');
 if(files.length!==supply+1)throw Error('Select exactly 1.json through '+supply+'.json plus contract.json');
 let bytes=0;const seen=new Set();
 for(const file of files){
  if(seen.has(file.name))throw Error('Duplicate file '+file.name);seen.add(file.name);bytes+=file.size;
  if(file.size>524288||bytes>16*1024*1024)throw Error('Metadata validation exceeds the 512 KiB/file or 16 MiB batch safety limit');
  const meta=JSON.parse(await file.text());if(!meta||typeof meta!=='object'||Array.isArray(meta))throw Error('Invalid metadata '+file.name);
  if(file.name==='contract.json'){
   if(typeof meta.name!=='string'||!meta.name.trim())throw Error('contract.json requires a name');
   validateIPFS(meta.image);if(meta.banner_image)validateIPFS(meta.banner_image);continue;
  }
  if(!/^[1-9]\d*\.json$/.test(file.name)||Number(file.name.slice(0,-5))>supply)throw Error('Invalid token filename '+file.name);
  if(typeof meta.name!=='string'||!meta.name.trim())throw Error('Missing name in '+file.name);
  validateIPFS(meta.image);if(meta.animation_url)validateIPFS(meta.animation_url);
  if(meta.attributes!==undefined)validateTraits(meta.attributes);
 }
 if(!seen.has('contract.json'))throw Error('Missing contract.json');
 return {files:files.length,bytes,note:'Local metadata structure validated. This does not prove public pinning, remote byte availability or the final directory CID. Verify those separately before deployment.'};
}
