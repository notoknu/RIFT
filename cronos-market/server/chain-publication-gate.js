import {ChainReadError} from './chain-read-quorum.js';
const need=(v,c)=>{if(!v)throw new ChainReadError(c)};
const hash=v=>typeof v==='string'&&/^0x[0-9a-f]{64}$/i.test(v);
/** Independently compare every acquired header before publication. Does not verify logs/receipts. */
export async function verifyPublicationHeaders({reader,headers,chainId=25,signal,timeoutMs=15000}={}){
 need(reader&&typeof reader.readCheckpoint==='function'&&Array.isArray(headers)&&headers.length>=1&&headers.length<=33&&Number.isInteger(timeoutMs)&&timeoutMs>=1&&timeoutMs<=60000,'INVALID_PUBLICATION_AGREEMENT');
 need(headers.every((h,i)=>Number.isSafeInteger(h?.number)&&h.number>=0&&hash(h.hash)&&hash(h.parentHash)&&(!i||h.number===headers[i-1].number+1&&h.parentHash.toLowerCase()===headers[i-1].hash.toLowerCase())),'INVALID_PUBLICATION_HEADERS');
 // Detach mutable input before any asynchronous call.
 const pinned=headers.map(h=>({number:h.number,hash:h.hash.toLowerCase(),parentHash:h.parentHash.toLowerCase()}));
 let timer,onAbort,stopped=false;const check=()=>need(!stopped&&!signal?.aborted,'CHAIN_AGREEMENT_CANCELLED');
 const interrupt=new Promise((_,reject)=>{timer=setTimeout(()=>{stopped=true;reject(new ChainReadError('CHAIN_AGREEMENT_TIMEOUT'))},timeoutMs);onAbort=()=>{stopped=true;reject(new ChainReadError('CHAIN_AGREEMENT_CANCELLED'))};signal?.addEventListener('abort',onAbort,{once:true});if(signal?.aborted)onAbort()});
 const acquire=async()=>{let minimumHead=Infinity;for(const h of pinned){check();const evidence=await reader.readCheckpoint(h.number);check();need(evidence?.chainId===chainId&&evidence.block?.number===h.number&&evidence.block.hash?.toLowerCase()===h.hash&&evidence.block.parentHash?.toLowerCase()===h.parentHash,'PUBLICATION_CHAIN_DISAGREEMENT');need(Array.isArray(evidence.agreeingProviders)&&new Set(evidence.agreeingProviders).size>=2&&Number.isSafeInteger(evidence.observedHead)&&evidence.observedHead>=h.number,'INVALID_PUBLICATION_EVIDENCE');minimumHead=Math.min(minimumHead,evidence.observedHead)}return Object.freeze({fromBlock:pinned[0].number,toBlock:pinned.at(-1).number,verifiedHeaders:pinned.length,minimumObservedHead:minimumHead,scope:'Independent header agreement only; not log completeness or consensus proof'})};
 try{return await Promise.race([acquire(),interrupt])}finally{stopped=true;clearTimeout(timer);signal?.removeEventListener('abort',onAbort)}
}
