import {open} from 'node:fs/promises';
import {constants} from 'node:fs';
import {captureLocalProjectionImage,planProjectionPublication,applyProjectionPublication,projectionPublicationHash,validateProjectionSourceAcceptance} from '../server/projection-publication.js';
import {validateProjectionRemoteConnection} from '../server/libsql-projection-read-repository.js';
import {requireProjectionRead as need} from '../shared/projection-read-contract.js';

const MAX_DOCUMENT=9*1024*1024;
async function readPrivate(path,{budget}={}){need(typeof path==='string'&&path.length>0,'PUBLICATION_FILE_REQUIRED');const f=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);try{const s=await f.stat();need(s.isFile()&&s.nlink===1&&(s.mode&0o077)===0&&s.size>0&&s.size<=MAX_DOCUMENT,'PRIVATE_PUBLICATION_DOCUMENT_REQUIRED');if(budget){need(s.size<=budget.remaining,'PROJECTION_SOURCE_EVIDENCE_LIMIT');budget.remaining-=s.size}const buffer=Buffer.alloc(s.size+1);let n=0;while(n<buffer.length){const r=await f.read(buffer,n,buffer.length-n,n);if(!r.bytesRead)break;n+=r.bytesRead}const after=await f.stat();need(n===s.size&&s.size===after.size&&s.mtimeMs===after.mtimeMs&&s.ctimeMs===after.ctimeMs,'PUBLICATION_DOCUMENT_CHANGED');return JSON.parse(buffer.subarray(0,n))}finally{await f.close()}}
async function writePrivate(path,value){need(typeof path==='string'&&path.length>0,'PUBLICATION_OUTPUT_REQUIRED');const bytes=Buffer.from(JSON.stringify(value)+'\n');need(bytes.length<=MAX_DOCUMENT,'PUBLICATION_DOCUMENT_LIMIT');const f=await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);try{await f.writeFile(bytes);await f.sync()}finally{await f.close()}}
let client,outcome;
try{
 need(process.argv.length===3,'PUBLICATION_CONFIG_PATH_REQUIRED');const c=await readPrivate(process.argv[2]);
 need(c&&c.version===1&&['export','plan','apply'].includes(c.action),'PUBLICATION_CONFIG_INVALID');
 const fields={export:['version','action','kind','binding','sourcePath','outputPath'],plan:['version','action','imagePath','acceptancePath','acceptedSourceHash','evidencePaths','outputPath','remote'],apply:['version','action','planPath','reviewedHash','acceptedSourceHash','evidencePaths','receiptPath','remote']};
 need(Object.keys(c).every(k=>fields[c.action].includes(k)),'PUBLICATION_CONFIG_INVALID');
 if(c.action==='export'){const image=await captureLocalProjectionImage({kind:c.kind,binding:c.binding,path:c.sourcePath});await writePrivate(c.outputPath,image);console.log(JSON.stringify({status:'exported',imageDigest:projectionPublicationHash(image)}))}
 else{
  const remote=c.remote;need(remote&&Object.keys(remote).every(k=>['url','approvedHost','authTokenEnv','writeAuthorized'].includes(k))&&/^[A-Z][A-Z0-9_]{0,127}$/.test(remote.authTokenEnv||''),'PUBLICATION_CONFIG_INVALID');
  if(c.action==='apply')need(remote.writeAuthorized===true,'PUBLICATION_WRITE_AUTHORIZATION_REQUIRED');
  const authToken=process.env[remote.authTokenEnv],url=validateProjectionRemoteConnection({url:remote.url,approvedHost:remote.approvedHost,authToken});
  const document=await readPrivate(c.action==='plan'?c.imagePath:c.planPath),image=c.action==='plan'?document:document.image;
  need(image&&typeof image.kind==='string'&&image.binding,'PROJECTION_IMAGE_INVALID');
  const acceptance=c.action==='plan'?await readPrivate(c.acceptancePath):document.acceptance;
  validateProjectionSourceAcceptance({image,acceptance,acceptedSourceHash:c.acceptedSourceHash});
  need(Array.isArray(c.evidencePaths)&&c.evidencePaths.length===acceptance.evidenceDigests.length&&c.evidencePaths.every(p=>typeof p==='string'),'PROJECTION_SOURCE_EVIDENCE_REQUIRED');
  const evidenceDigests=[],budget={remaining:16*1024*1024};for(const path of c.evidencePaths)evidenceDigests.push(projectionPublicationHash(await readPrivate(path,{budget})));
  need(new Set(evidenceDigests).size===evidenceDigests.length&&evidenceDigests.every(d=>acceptance.evidenceDigests.includes(d)),'PROJECTION_SOURCE_EVIDENCE_MISMATCH');
  const targetId=projectionPublicationHash({url,kind:image.kind,binding:image.binding});
  // Before opening a connection, reject missing/mismatched apply review pins.
  if(c.action==='apply')need(typeof c.reviewedHash==='string'&&projectionPublicationHash(document)===c.reviewedHash&&document.targetId===targetId&&typeof c.receiptPath==='string'&&c.receiptPath.length>0,'PROJECTION_PUBLICATION_REVIEW_REQUIRED');
  const {createClient}=await import('@libsql/client');client=createClient({url,authToken,intMode:'number'});
  if(c.action==='plan'){const plan=await planProjectionPublication({client,image,targetId,acceptance,acceptedSourceHash:c.acceptedSourceHash});await writePrivate(c.outputPath,plan);console.log(JSON.stringify({status:'planned',reviewedHash:projectionPublicationHash(plan),targetId,imageDigest:plan.imageDigest,expectedDigest:plan.expectedDigest}))}
  else{const receipt=await applyProjectionPublication({client,plan:document,reviewedHash:c.reviewedHash,targetId,acceptedSourceHash:c.acceptedSourceHash});outcome=receipt.status;await writePrivate(c.receiptPath,{format:'rift-projection-publication-receipt-v1',reviewedHash:c.reviewedHash,acceptedSourceHash:c.acceptedSourceHash,...receipt});console.log(JSON.stringify(receipt))}
 }
}catch(error){console.error(JSON.stringify({error:typeof error.code==='string'&&/^PROJECTION_|^PUBLICATION_|^PRIVATE_PUBLICATION_/.test(error.code)?error.code:'PROJECTION_PUBLICATION_FAILED',publicationOutcome:error.publicationOutcome||outcome||'no-commit-result',cleanupFailed:!!error.cleanupFailed}));process.exitCode=2}
finally{if(client)try{await client.close()}catch{console.error(JSON.stringify({error:'PROJECTION_CLIENT_CLOSE_FAILED',publicationOutcome:outcome||'no-commit-result'}));process.exitCode=2}}
