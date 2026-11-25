import {isAddress,getAddress,keccak256} from 'ethers';
const BASE='https://sourcify.dev/server';const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const address=v=>{if(!isAddress(v||'')||/^0x0{40}$/i.test(v))throw Error('Enter a nonzero collection address');return getAddress(v)};
function match(v){return ['exact_match','match'].includes(v)?v:null}
export function normalizeVerification(value,expectedAddress){
 if(String(value?.chainId)!=='25'||String(value?.address).toLowerCase()!==address(expectedAddress).toLowerCase())throw Error('Verifier returned a different chain or contract');
 return {chainId:25,address:address(expectedAddress),creationMatch:match(value.creationMatch),runtimeMatch:match(value.runtimeMatch),verifiedAt:typeof value.verifiedAt==='string'?value.verifiedAt.slice(0,64):null,state:match(value.creationMatch)&&match(value.runtimeMatch)?'matched':'partial-or-unmatched',scope:'Source/bytecode matching only. Not a security audit, marketplace approval or ownership attestation.'};
}
async function responseJSON(r){const reader=r.body?.getReader();if(!reader)throw Error('Empty verification response');let n=0,chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>1048576)throw Error('Verification response exceeds safety limit');chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}const out=new Uint8Array(n);let offset=0;for(const c of chunks){out.set(c,offset);offset+=c.length}return JSON.parse(new TextDecoder().decode(out))}
export async function checkSourceVerification(contract,{fetcher=fetch}={}){const a=address(contract),r=await fetcher(BASE+'/v2/contract/25/'+a,{credentials:'omit',signal:AbortSignal.timeout(15000)});if(r.status===404)return {state:'not-found',chainId:25,address:a,scope:'No matching record returned by this verifier; not proof of an invalid contract.'};if(!r.ok)throw Error('Verification lookup unavailable; retry later');return normalizeVerification(await responseJSON(r),a)}
export function prepareVerificationSubmission(deployment,artifact,bundle){
 const a=address(deployment?.address);if(deployment.chainId!==25||!/^0x[a-f0-9]{64}$/i.test(deployment.transactionHash||''))throw Error('A recorded Cronos deployment receipt is required');
 const hash=keccak256(artifact.bytecode);if(hash!==deployment.bytecodeHash||hash!==bundle.bytecodeHash)throw Error('Build differs from deployment. Use the original verification package.');
 if(bundle.standardInput?.language!=='Solidity'||typeof bundle.contract!=='string'||!/^\d+\.\d+\.\d+\+commit\.[a-f0-9]+$/.test(bundle.compiler||''))throw Error('Invalid bundled verification inputs');
 const body={stdJsonInput:bundle.standardInput,compilerVersion:bundle.compiler,contractIdentifier:bundle.contract,creationTransactionHash:deployment.transactionHash};if(new TextEncoder().encode(JSON.stringify(body)).length>2097152)throw Error('Verification inputs exceed 2 MiB');return {address:a,body};
}
export async function submitSourceVerification(prepared,{fetcher=fetch}={}){
 const a=address(prepared.address);let r;try{r=await fetcher(BASE+'/v2/verify/25/'+a,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(prepared.body),signal:AbortSignal.timeout(30000)})}catch{throw Error('Submission outcome uncertain. Check public source status before resubmitting; the verifier may have accepted it.')}
 if(!r.ok)throw Error('Verifier did not accept the submission. Check public status and retain the verification ZIP.');const data=await responseJSON(r);if(!UUID.test(data.verificationId||''))throw Error('Submission response has no valid job ID. Check public status before retrying.');return {verificationId:data.verificationId,address:a,chainId:25,state:'submitted-not-verified'};
}
export async function checkVerificationJob(job,{fetcher=fetch}={}){
 if(!UUID.test(job?.verificationId||''))throw Error('Invalid verification job');const a=address(job.address),r=await fetcher(BASE+'/v2/verify/'+job.verificationId,{credentials:'omit',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Job lookup unavailable; check public source status');const d=await responseJSON(r);if(d.verificationId!==job.verificationId)throw Error('Verifier returned a different job');
 if(!d.isJobCompleted)return {...job,state:'pending'};if(d.error)return {...job,state:'failed',error:typeof d.error.customCode==='string'?d.error.customCode.slice(0,80):'verification-failed'};return {...job,...normalizeVerification(d.contract,a)};
}
