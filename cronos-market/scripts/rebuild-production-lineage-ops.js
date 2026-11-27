import {open,mkdir,lstat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {isAbsolute,join} from 'node:path';
import {captureCompletedCollectionRebuild,validateProductionLineage} from '../server/rebuild-production-lineage.js';
import {projectionPublicationHash} from '../server/projection-publication.js';
const need=(v,c)=>{if(!v)throw Object.assign(Error(c),{code:c})};
const exact=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...k].sort().join(',');
let total=0,partial=false;
async function read(path,max){need(typeof path==='string'&&isAbsolute(path),'LINEAGE_ABSOLUTE_PATH_REQUIRED');const f=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);try{const s=await f.stat();need(s.isFile()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>0&&s.size<=max,'LINEAGE_PRIVATE_FILE_REQUIRED');total+=s.size;need(total<=20971520,'LINEAGE_BYTE_BUDGET');const bytes=Buffer.alloc(s.size+1);let n=0;while(n<bytes.length){const r=await f.read(bytes,n,bytes.length-n,n);if(!r.bytesRead)break;n+=r.bytesRead}const a=await f.stat();need(n===s.size&&a.size===s.size&&a.mtimeMs===s.mtimeMs&&a.ctimeMs===s.ctimeMs,'LINEAGE_FILE_CHANGED');return JSON.parse(bytes.subarray(0,n).toString('utf8'))}finally{await f.close()}}
async function write(path,value){const bytes=Buffer.from(JSON.stringify(value)+'\n');need(bytes.length<=9437184,'LINEAGE_ARTIFACT_LIMIT');const f=await open(path,'wx',0o600);try{await f.writeFile(bytes);await f.sync()}finally{await f.close()}}
try{
 need(process.argv.length===3,'LINEAGE_CONFIG_REQUIRED');const c=await read(process.argv[2],65536);need(c?.version===1&&['capture','inspect'].includes(c.action)&&typeof c.outputDirectory==='string'&&isAbsolute(c.outputDirectory),'LINEAGE_CONFIG_INVALID');
 if(c.action==='capture'){
  need(exact(c,['version','action','jobsPath','jobId','runtimeFingerprint','paths','outputDirectory']),'LINEAGE_CONFIG_INVALID');const result=await captureCompletedCollectionRebuild(c);
  await mkdir(c.outputDirectory,{mode:0o700});partial=true;await write(join(c.outputDirectory,'image-0.json'),result.images[0]);await write(join(c.outputDirectory,'image-1.json'),result.images[1]);await write(join(c.outputDirectory,'lineage.json'),result.manifest);
  const receipt={format:'rift-rebuild-production-capture-receipt-v1',manifestDigest:result.manifestDigest,imageDigests:result.manifest.imageDigests,activated:false};await write(join(c.outputDirectory,'receipt.json'),receipt);console.log(JSON.stringify({...receipt,status:'captured-awaiting-source-acceptance',verified:false}));
 }else{
  need(exact(c,['version','action','outputDirectory','manifestDigest']),'LINEAGE_CONFIG_INVALID');const st=await lstat(c.outputDirectory);need(st.isDirectory()&&!st.isSymbolicLink()&&(st.mode&0o077)===0,'LINEAGE_PRIVATE_DIRECTORY_REQUIRED');const manifest=await read(join(c.outputDirectory,'lineage.json'),65536),receipt=await read(join(c.outputDirectory,'receipt.json'),65536),images=[];for(let i=0;i<2;i++)images.push(await read(join(c.outputDirectory,'image-'+i+'.json'),9437184));
  need(receipt.format==='rift-rebuild-production-capture-receipt-v1'&&receipt.activated===false&&receipt.manifestDigest===c.manifestDigest&&projectionPublicationHash(receipt.imageDigests)===projectionPublicationHash(manifest.imageDigests),'LINEAGE_RECEIPT_MISMATCH');for(const image of images)validateProductionLineage(manifest,c.manifestDigest,[{image}]);need(images.every((image,i)=>projectionPublicationHash(image)===manifest.imageDigests[i]),'LINEAGE_IMAGE_ORDER_CHANGED');console.log(JSON.stringify({status:'captured-artifacts-match-reviewed-lineage',manifestDigest:c.manifestDigest,verified:false,activated:false,scope:'Read-only restart inspection; no fresh chain/source acceptance or job approval.'}));
 }
}catch(e){console.error(JSON.stringify({code:/^LINEAGE_[A-Z_]+$/.test(e.code||'')?e.code:'REBUILD_PRODUCTION_LINEAGE_FAILED',partialOutputPossible:partial,activated:false,scope:'Retain partial artifacts; never overwrite. Missing receipt requires inspection/new output directory, not inferred success.'}));process.exitCode=2}
