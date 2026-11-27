import {validateProductionArtifactBindings} from './owned-production-artifacts.js';
import {open,mkdir,lstat,opendir,statfs} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,isAbsolute,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {produceOwnedProjectionData} from './owned-projection-producer.js';
import {projectionPublicationHash} from './projection-publication.js';
import {validateOwnedPublicData} from '../shared/owned-public-data.js';
import {requireProduction as need,readProductionBytes,revalidateProductionSources,productionExact} from './owned-production-config.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
const encode=v=>Buffer.from(JSON.stringify(v,null,2)+'\n');
const names=new Set(['intent.json','dataset.json','evidence.json','receipt.json']);
async function syncDirectory(path){const f=await open(path,constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW);try{await f.sync()}finally{await f.close()}}
async function privateDirectory(path){const s=await lstat(path);need(s.isDirectory()&&!s.isSymbolicLink()&&(s.mode&0o077)===0,'PRODUCER_PRIVATE_DIRECTORY_REQUIRED');const entries=await opendir(path);try{let count=0;for await(const entry of entries){need(++count<=4&&names.has(entry.name)&&entry.isFile(),'PRODUCER_UNMANAGED_OUTPUT')}}finally{try{await entries.close()}catch(e){if(e.code!=='ERR_DIR_CLOSED')throw e}}}
async function existing(path,max){try{return await readProductionBytes(path,max)}catch(e){if(e.code==='ENOENT')return null;throw e}}
async function put(directory,name,bytes,guard){const path=join(directory,name),old=await existing(path,2097152);if(old){need(old.equals(bytes),'PRODUCER_PARTIAL_CONTENT_CONFLICT');return false}guard();const f=await open(path,'wx',0o600);try{await f.writeFile(bytes);await f.sync()}finally{await f.close()}await syncDirectory(directory);return true}
/** Finite reviewed-source production, with deterministic resume and no live
 * pointer changes. Files that differ are never repaired, replaced or deleted. */
export async function runOwnedProductionWorkflow({options,outputDirectory,requestDigest,guard=()=>{}}={}){
 need(typeof guard==='function'&&typeof outputDirectory==='string'&&isAbsolute(outputDirectory)&&/^[a-f0-9]{64}$/.test(requestDigest||'')&&projectionPublicationHash({options,outputDirectory})===requestDigest,'PRODUCER_REQUEST_CHANGED');
 const check=()=>{guard();revalidateProductionSources(options)};check();
 // Validate all semantics before creating any output, even for a fresh request.
 produceOwnedProjectionData(options);let created=false;try{await mkdir(outputDirectory,{mode:0o700});created=true;await syncDirectory(dirname(outputDirectory))}catch(e){if(e.code!=='EEXIST')throw e}await privateDirectory(outputDirectory);
 let intentBytes=await existing(join(outputDirectory,'intent.json'),65536),intent;if(intentBytes){intent=JSON.parse(intentBytes);need(productionExact(intent,['format','requestDigest','generatedAt'])&&intent.format==='rift-owned-production-intent-v1'&&intent.requestDigest===requestDigest&&Number.isSafeInteger(intent.generatedAt)&&intent.generatedAt>0&&intent.generatedAt<=Date.now(),'PRODUCER_INTENT_CHANGED')}else{
  for(const name of ['dataset.json','evidence.json','receipt.json'])need(!await existing(join(outputDirectory,name),2097152),'PRODUCER_UNMANAGED_OUTPUT');intent={format:'rift-owned-production-intent-v1',requestDigest,generatedAt:Date.now()};intentBytes=encode(intent);
 }
 const result=produceOwnedProjectionData({...options,now:intent.generatedAt});validateOwnedPublicData(result.data);
 const receipt={format:'rift-owned-projection-production-receipt-v1',requestDigest,datasetId:result.data.datasetId,rebuildLineage:result.evidence.rebuildLineage,collectionRebuildLineages:result.evidence.collectionRebuildLineages,marketplaceRebuildLineage:result.evidence.exchangeAccounting?.rebuildLineage||result.evidence.legacyAccounting?.rebuildLineage||null,datasetSha256:sha(result.dataBytes),evidenceSha256:sha(result.evidenceBytes),expiresAt:result.data.expiresAt,collectionCount:result.data.collections.length,candidateCount:result.data.walletCandidates.length,verified:false,activated:false,scope:'Derived private artifacts only. Source acceptance remains independently required; no deployment, live selection, signatures or trading.'};const receiptBytes=encode(receipt),files=[['intent.json',intentBytes],['evidence.json',result.evidenceBytes],['dataset.json',result.dataBytes],['receipt.json',receiptBytes]];let missingBytes=0;
 for(const [name,bytes]of files){const old=await existing(join(outputDirectory,name),2097152);if(old)need(old.equals(bytes),'PRODUCER_PARTIAL_CONTENT_CONFLICT');else missingBytes+=bytes.length}need(files.reduce((n,[,bytes])=>n+bytes.length,0)<=3145728,'PRODUCER_OUTPUT_BYTE_LIMIT');
 if(missingBytes){const fs=await statfs(outputDirectory,{bigint:true});need(fs.bavail*fs.bsize>=BigInt(missingBytes)+16777216n,'PRODUCER_HEADROOM_REQUIRED')}
 let written=0;for(const [name,bytes]of files){check();validateOwnedPublicData(result.data);if(await put(outputDirectory,name,bytes,guard))written++}check();validateOwnedPublicData(result.data);
 return {...receipt,status:written?'produced-awaiting-activation':'already-produced',receiptSha256:sha(receiptBytes),directoryCreated:created,filesWritten:written};
}
export async function inspectOwnedProduction({outputDirectory,receiptSha256}={}){
 need(typeof outputDirectory==='string'&&isAbsolute(outputDirectory)&&/^[a-f0-9]{64}$/.test(receiptSha256||''),'PRODUCER_INSPECTION_INVALID');await privateDirectory(outputDirectory);const bytes=await readProductionBytes(join(outputDirectory,'receipt.json'),65536);need(sha(bytes)===receiptSha256,'PRODUCER_RECEIPT_PIN_MISMATCH');const receipt=JSON.parse(bytes),dataBytes=await readProductionBytes(join(outputDirectory,'dataset.json'),1048576),evidenceBytes=await readProductionBytes(join(outputDirectory,'evidence.json'),1048576);need(receipt.format==='rift-owned-projection-production-receipt-v1'&&receipt.activated===false&&sha(dataBytes)===receipt.datasetSha256&&sha(evidenceBytes)===receipt.evidenceSha256,'PRODUCER_ARTIFACT_PIN_MISMATCH');const data=validateOwnedPublicData(JSON.parse(dataBytes));const intent=receipt.requestDigest!==undefined?JSON.parse(await readProductionBytes(join(outputDirectory,'intent.json'),65536)):null;validateProductionArtifactBindings({receipt,data,evidence:JSON.parse(evidenceBytes),intent});
 return {status:'production-artifacts-match-reviewed-receipt',receiptSha256,expiresAt:data.expiresAt,collectionCount:data.collections.length,candidateCount:data.walletCandidates.length,verified:false,activated:false,scope:'Read-only artifact identity/expiry; not renewed source or chain acceptance.'};
}
