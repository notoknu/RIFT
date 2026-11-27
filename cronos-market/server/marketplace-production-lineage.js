import {createHash} from 'node:crypto';
import {isAbsolute} from 'node:path';
import {openMaintenanceJobs} from './maintenance-jobs.js';
import {captureLocalProjectionImage,validateProjectionImage,projectionPublicationHash} from './projection-publication.js';
const need=(v,c)=>{if(!v)throw Object.assign(Error(c),{code:c})};
const pin=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const compare=(a,b)=>a<b?-1:a>b?1:0;
function kindFor(model){need(['legacy','exchange-v2'].includes(model),'MARKET_LINEAGE_MODEL_INVALID');return model==='legacy'?'legacy-market':'exchange'}
/** Digest framing mirrors marketplaceProjectionDigest exactly, not a new
 * economic-verification claim. Schemas and bounded images are admitted first. */
export function capturedMarketplaceRebuildDigest(image){
 validateProjectionImage(image);need(['legacy-market','exchange'].includes(image.kind),'MARKET_LINEAGE_IMAGE_INVALID');const tables=image.kind==='legacy-market'?[['events','tx,log_index,block,id,kind,payload','block,log_index'],['orders','id,seller,nft,token_id,price_wei,active','id']]:[['exchange_events','tx,log_index,block,block_hash,type,id,kind,payload','block,log_index'],['exchange_orders','type,id,account,nft,active,expiry,document','type,id']];const h=createHash('sha256');let rows=0;
 for(const [name,columns,order]of tables){const input=image.tables.find(t=>t.name===name)?.rows;need(Array.isArray(input),'MARKET_LINEAGE_TABLE_MISSING');h.update(name+'\n');for(const row of [...input].sort((a,b)=>{for(const key of order.split(',')){const c=compare(a[key],b[key]);if(c)return c}return 0})){need(++rows<=10000,'MARKET_LINEAGE_ROW_LIMIT');const selected={};for(const key of columns.split(',')){need(Object.hasOwn(row,key),'MARKET_LINEAGE_COLUMN_MISSING');selected[key]=row[key]}h.update(JSON.stringify(selected)+'\n')}}return h.digest('hex');
}
export async function captureCompletedMarketplaceRebuild({jobsPath,jobId,runtimeFingerprint,paths}={}){
 need(pin(jobId)&&pin(runtimeFingerprint)&&Array.isArray(paths)&&paths.length===2&&paths.every(p=>typeof p==='string'&&isAbsolute(p))&&paths[0]!==paths[1],'MARKET_LINEAGE_SELECTION_INVALID');const jobs=await openMaintenanceJobs(jobsPath,{readOnly:true});
 try{const get=()=>jobs.inspect().find(j=>j.id===jobId),job=get();need(job?.kind==='marketplace-rebuild'&&job.phase==='complete'&&job.spec.runtimeFingerprint===runtimeFingerprint&&job.result?.code==='MARKETPLACE_REBUILD_PAIR_VERIFIED'&&pin(job.result.digest)&&job.result.targetBlock===job.spec.targetBlock&&job.result.targetHash===job.spec.targetHash,'MARKET_LINEAGE_COMPLETED_REBUILD_REQUIRED');
 const model=job.spec.binding.model,kind=kindFor(model),binding={chainId:25,address:job.spec.binding.address,startBlock:job.spec.binding.startBlock},images=[];
 for(const path of paths){const image=await captureLocalProjectionImage({kind,binding,path}),state=image.tables.find(t=>t.name===(kind==='exchange'?'exchange_state':'config'))?.rows[0];need(state?.last_block===job.spec.targetBlock&&state.block_hash===job.spec.targetHash,'MARKET_LINEAGE_CHECKPOINT_CHANGED');need(capturedMarketplaceRebuildDigest(image)===job.result.digest,'MARKET_LINEAGE_REBUILD_DIGEST_CHANGED');images.push(image)}
 const after=get();need(after&&projectionPublicationHash(after)===projectionPublicationHash(job),'MARKET_LINEAGE_JOB_CHANGED');
 const manifest={format:'rift-marketplace-production-lineage-v1',chainId:25,model,binding,jobId,jobVersion:job.version,runtimeFingerprint,targetBlock:job.spec.targetBlock,targetHash:job.spec.targetHash,rebuildDigest:job.result.digest,imageDigests:images.map(projectionPublicationHash),capturedAt:Date.now(),activated:false,scope:'Completed paired local marketplace rebuild with exact recaptured event/order digest agreement. Not independent acquisition, bytecode/denomination attestation, fresh source approval or live activation.'};return {images,manifest,manifestDigest:projectionPublicationHash(manifest),activated:false};
 }finally{jobs.close()}
}
export function validateMarketplaceProductionLineage({manifest,reviewedHash,image}={}){
 need(pin(reviewedHash)&&manifest?.format==='rift-marketplace-production-lineage-v1'&&manifest.chainId===25&&manifest.activated===false&&projectionPublicationHash(manifest)===reviewedHash&&pin(manifest.jobId)&&pin(manifest.runtimeFingerprint)&&pin(manifest.rebuildDigest)&&Number.isSafeInteger(manifest.jobVersion)&&manifest.jobVersion>=0&&Number.isSafeInteger(manifest.capturedAt)&&manifest.capturedAt>0&&manifest.capturedAt<=Date.now()&&Number.isSafeInteger(manifest.targetBlock)&&manifest.targetBlock>=0&&/^0x[0-9a-f]{64}$/.test(manifest.targetHash||'')&&Array.isArray(manifest.imageDigests)&&manifest.imageDigests.length===2&&manifest.imageDigests.every(pin),'MARKET_LINEAGE_REVIEW_INVALID');
 validateProjectionImage(image);need(image.kind===kindFor(manifest.model)&&projectionPublicationHash(image.binding)===projectionPublicationHash(manifest.binding)&&manifest.imageDigests.includes(projectionPublicationHash(image)),'MARKET_LINEAGE_IMAGE_CHANGED');const state=image.tables.find(t=>t.name===(image.kind==='exchange'?'exchange_state':'config')).rows[0];need(state.last_block===manifest.targetBlock&&state.block_hash===manifest.targetHash&&capturedMarketplaceRebuildDigest(image)===manifest.rebuildDigest,'MARKET_LINEAGE_PROJECTION_CHANGED');
 return {format:manifest.format,manifestDigest:reviewedHash,jobId:manifest.jobId,jobVersion:manifest.jobVersion,model:manifest.model,rebuildDigest:manifest.rebuildDigest};
}
