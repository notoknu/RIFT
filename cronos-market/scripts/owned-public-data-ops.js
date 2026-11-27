import {open} from 'node:fs/promises';
import {constants} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateOwnedPublicData,OWNED_PUBLIC_DATA_MAX_BYTES} from '../shared/owned-public-data.js';
async function read(path,limit){const file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);try{const s=await file.stat();if(!s.isFile()||s.nlink!==1||(s.mode&0o022)!==0||s.size<1||s.size>limit)throw Error('Unsafe or oversized review file');const bytes=Buffer.alloc(s.size+1);let n=0;while(n<bytes.length){const r=await file.read(bytes,n,bytes.length-n,n);if(!r.bytesRead)break;n+=r.bytesRead}const after=await file.stat();if(n!==s.size||s.size!==after.size||s.mtimeMs!==after.mtimeMs||s.ctimeMs!==after.ctimeMs)throw Error('Review file changed');return bytes.subarray(0,n)}finally{await file.close()}}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
try{
 if(process.argv.length!==3)throw Error('One JSON review configuration required');
 const c=JSON.parse(await read(process.argv[2],65536));if(!c||Object.keys(c).sort().join(',')!=='action,evidencePaths,inputPath,version'||c.version!==1||c.action!=='inspect'||typeof c.inputPath!=='string'||!Array.isArray(c.evidencePaths)||c.evidencePaths.length<1||c.evidencePaths.length>32||c.evidencePaths.some(p=>typeof p!=='string'))throw Error('Invalid owned data review configuration');
 const bytes=await read(c.inputPath,OWNED_PUBLIC_DATA_MAX_BYTES),data=validateOwnedPublicData(JSON.parse(bytes));let total=0;const pins=[];
 for(const path of c.evidencePaths){const evidence=await read(path,2097152);total+=evidence.length;if(total>16777216)throw Error('Evidence byte budget exceeded');pins.push(hash(evidence))}
 if(new Set(pins).size!==pins.length||pins.length!==data.coverage.evidenceDigests.length||pins.some(p=>!data.coverage.evidenceDigests.includes(p)))throw Error('Owned dataset evidence set mismatch');
 console.log(JSON.stringify({format:'rift-owned-public-data-review-v1',datasetId:data.datasetId,sha256:hash(bytes),bytes:bytes.length,collections:data.collections.length,walletCandidateCount:data.walletCandidates.length,generatedAt:new Date(data.generatedAt).toISOString(),expiresAt:new Date(data.expiresAt).toISOString(),evidenceCount:pins.length,verified:false,activated:false,scope:'Shape/time/units and local artifact pin checks only. Review contents/provenance separately. No wallet addresses/candidates are printed; no file or configuration is written.'},null,2));
}catch{console.error(JSON.stringify({error:'OWNED_PUBLIC_DATA_REVIEW_FAILED',verified:false,activated:false}));process.exitCode=2}
