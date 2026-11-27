import {isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {captureLocalProjectionImage,projectionPublicationHash} from './projection-publication.js';
import {openMaintenanceJobs} from './maintenance-jobs.js';
const need=(v,c)=>{if(!v)throw Object.assign(Error(c),{code:c})};
const pin=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const fields=[['collection_events','tx,log_index,block,hash,kind,payload',['block','log_index']],['collection_moves','tx,log_index,sub_index,block,token_key,payload',['block','log_index','sub_index']],['collection_tokens','token_key,supply,document',['token_key']],['collection_balances','token_key,owner,quantity',['token_key','owner']]];
const compare=(a,b)=>a<b?-1:a>b?1:0;
/** Same ownership-only digest framing as collectionProjectionDigest, over a
 * bounded captured image. Metadata is deliberately not rebuild consensus. */
export function capturedCollectionRebuildDigest(image){
 need(image?.kind==='collection','LINEAGE_COLLECTION_REQUIRED');const hash=createHash('sha256');let rows=0;
 for(const [table,columns,order]of fields){const input=image.tables.find(t=>t.name===table)?.rows;need(Array.isArray(input),'LINEAGE_TABLE_MISSING');hash.update(table+'\n');for(const row of [...input].sort((a,b)=>{for(const k of order){const c=compare(a[k],b[k]);if(c)return c}return 0})){need(++rows<=10000,'LINEAGE_ROW_LIMIT');const record={};for(const k of columns.split(',')){need(Object.hasOwn(row,k),'LINEAGE_COLUMN_MISSING');record[k]=row[k]}hash.update(JSON.stringify(record)+'\n')}}return hash.digest('hex');
}
/** Captures existing DBs read-only. Completed job is re-read afterward; it is
 * lineage evidence, not a distributed fencing lock or fresh chain approval. */
export async function captureCompletedCollectionRebuild({jobsPath,jobId,runtimeFingerprint,paths}={}){
 need(pin(jobId)&&pin(runtimeFingerprint)&&Array.isArray(paths)&&paths.length===2&&paths.every(p=>typeof p==='string'&&isAbsolute(p))&&paths[0]!==paths[1],'LINEAGE_SELECTION_INVALID');const jobs=await openMaintenanceJobs(jobsPath,{readOnly:true});
 try{const get=()=>jobs.inspect().find(j=>j.id===jobId),job=get();need(job?.kind==='collection-rebuild'&&job.phase==='complete'&&job.spec.runtimeFingerprint===runtimeFingerprint&&job.result?.code==='REBUILD_PAIR_VERIFIED'&&pin(job.result.digest),'LINEAGE_COMPLETED_REBUILD_REQUIRED');
 const images=[];for(const path of paths){const image=await captureLocalProjectionImage({kind:'collection',binding:job.spec.binding,path}),s=image.tables.find(t=>t.name==='collection_state')?.rows[0];need(s?.last_block===job.spec.targetBlock&&s.hash===job.spec.targetHash&&image.tables.find(t=>t.name==='collection_scan')?.rows.length===0&&image.tables.find(t=>t.name==='collection_staged')?.rows.length===0,'LINEAGE_CHECKPOINT_CHANGED');need(capturedCollectionRebuildDigest(image)===job.result.digest,'LINEAGE_REBUILD_DIGEST_CHANGED');images.push(image)}
 const after=get();need(after&&projectionPublicationHash(after)===projectionPublicationHash(job),'LINEAGE_JOB_CHANGED');
 const manifest={format:'rift-rebuild-production-lineage-v1',chainId:25,jobId,jobVersion:job.version,runtimeFingerprint,binding:job.spec.binding,targetBlock:job.spec.targetBlock,targetHash:job.spec.targetHash,rebuildDigest:job.result.digest,imageDigests:images.map(projectionPublicationHash),capturedAt:Date.now(),activated:false,scope:'Completed local paired rebuild plus read-only recapture digest agreement; not fresh source acceptance, independent acquisition proof or live activation.'};return {images,manifest,manifestDigest:projectionPublicationHash(manifest),activated:false};
 }finally{jobs.close()}
}
export function validateProductionLineage(manifest,digest,inputs){
 need(pin(digest)&&manifest?.format==='rift-rebuild-production-lineage-v1'&&manifest.chainId===25&&manifest.activated===false&&projectionPublicationHash(manifest)===digest&&pin(manifest.jobId)&&pin(manifest.runtimeFingerprint)&&pin(manifest.rebuildDigest)&&Number.isSafeInteger(manifest.capturedAt)&&manifest.capturedAt>0&&manifest.capturedAt<=Date.now()&&Array.isArray(manifest.imageDigests)&&manifest.imageDigests.length===2&&manifest.imageDigests.every(pin)&&Array.isArray(inputs)&&inputs.length===1,'LINEAGE_REVIEW_INVALID');
 need(Number.isSafeInteger(manifest.jobVersion)&&manifest.jobVersion>=0&&Number.isSafeInteger(manifest.targetBlock)&&manifest.targetBlock>=0&&/^0x[0-9a-f]{64}$/.test(manifest.targetHash||''),'LINEAGE_CHECKPOINT_INVALID');
 const image=inputs[0].image,state=image?.tables?.find(t=>t.name==='collection_state')?.rows[0];need(image?.kind==='collection'&&projectionPublicationHash(image.binding)===projectionPublicationHash(manifest.binding)&&manifest.imageDigests.includes(projectionPublicationHash(image))&&state?.last_block===manifest.targetBlock&&state.hash===manifest.targetHash&&capturedCollectionRebuildDigest(image)===manifest.rebuildDigest,'LINEAGE_PRODUCTION_SOURCE_CHANGED');
 return {format:manifest.format,manifestDigest:digest,jobId:manifest.jobId,jobVersion:manifest.jobVersion,rebuildDigest:manifest.rebuildDigest};
}
