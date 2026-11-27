import {open,mkdir,lstat} from 'node:fs/promises';
import {isAbsolute,join} from 'node:path';
import {readTimeAcquisitionJSON as read} from '../server/exchange-time-acquisition.js';
import {captureCompletedMarketplaceRebuild,validateMarketplaceProductionLineage} from '../server/marketplace-production-lineage.js';
import {projectionPublicationHash} from '../server/projection-publication.js';
const need=(v,c)=>{if(!v)throw Object.assign(Error(c),{code:c})};
const exact=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...k].sort().join(',');
let partial=false;
async function write(path,value){const bytes=Buffer.from(JSON.stringify(value)+'\n');need(bytes.length<=9437184,'MARKET_LINEAGE_ARTIFACT_LIMIT');const f=await open(path,'wx',0o600);try{await f.writeFile(bytes);await f.sync()}finally{await f.close()}}
try{
 need(process.argv.length===3,'MARKET_LINEAGE_CONFIG_REQUIRED');const c=await read(process.argv[2],65536);need(c?.version===1&&['capture','inspect'].includes(c.action)&&typeof c.outputDirectory==='string'&&isAbsolute(c.outputDirectory),'MARKET_LINEAGE_CONFIG_INVALID');
 if(c.action==='capture'){
  need(exact(c,['version','action','jobsPath','jobId','runtimeFingerprint','paths','outputDirectory']),'MARKET_LINEAGE_CONFIG_INVALID');const result=await captureCompletedMarketplaceRebuild(c);await mkdir(c.outputDirectory,{mode:0o700});partial=true;
  for(let i=0;i<2;i++)await write(join(c.outputDirectory,'image-'+i+'.json'),result.images[i]);await write(join(c.outputDirectory,'lineage.json'),result.manifest);
  const receipt={format:'rift-marketplace-production-capture-receipt-v1',manifestDigest:result.manifestDigest,imageDigests:result.manifest.imageDigests,activated:false};await write(join(c.outputDirectory,'receipt.json'),receipt);console.log(JSON.stringify({...receipt,receiptDigest:projectionPublicationHash(receipt),status:'captured-awaiting-source-review',verified:false}));
 }else{
  need(exact(c,['version','action','outputDirectory','manifestDigest','receiptDigest']),'MARKET_LINEAGE_CONFIG_INVALID');const stat=await lstat(c.outputDirectory);need(stat.isDirectory()&&!stat.isSymbolicLink()&&(stat.mode&0o077)===0,'MARKET_LINEAGE_PRIVATE_DIRECTORY_REQUIRED');
  const manifest=await read(join(c.outputDirectory,'lineage.json'),65536),receipt=await read(join(c.outputDirectory,'receipt.json'),65536);need(receipt.format==='rift-marketplace-production-capture-receipt-v1'&&receipt.activated===false&&receipt.manifestDigest===c.manifestDigest&&projectionPublicationHash(receipt)===c.receiptDigest&&projectionPublicationHash(receipt.imageDigests)===projectionPublicationHash(manifest.imageDigests),'MARKET_LINEAGE_RECEIPT_CHANGED');
  for(let i=0;i<2;i++){const image=await read(join(c.outputDirectory,'image-'+i+'.json'),9437184);validateMarketplaceProductionLineage({manifest,reviewedHash:c.manifestDigest,image});need(projectionPublicationHash(image)===manifest.imageDigests[i],'MARKET_LINEAGE_IMAGE_ORDER_CHANGED')}
  console.log(JSON.stringify({status:'marketplace-capture-artifacts-match-reviewed-pins',manifestDigest:c.manifestDigest,receiptDigest:c.receiptDigest,verified:false,activated:false,scope:'Existing local artifact identity only; no fresh chain/source approval.'}));
 }
}catch(e){console.error(JSON.stringify({code:/^MARKET_LINEAGE_[A-Z_]+$/.test(e.code||'')?e.code:'MARKETPLACE_PRODUCTION_LINEAGE_FAILED',partialOutputPossible:partial,verified:false,activated:false,scope:'Retain incomplete directories; never overwrite or infer activation from partial artifacts.'}));process.exitCode=2}
