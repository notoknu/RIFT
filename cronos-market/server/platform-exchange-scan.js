import {syncPlatformExchange,PlatformSyncError} from './platform-exchange-sync.js';
import {boundedExchangeRpc,PlatformRpcError} from './platform-exchange-rpc.js';
import {ReceiptScanError} from './platform-exchange-receipts.js';
export class AdaptiveScanError extends Error{constructor(code){super(code);this.name='AdaptiveScanError';this.code=code;}}
const receiptBounds=new Set(['RECEIPT_TRANSACTION_LIMIT','RECEIPT_LOG_LIMIT','RECEIPT_BYTES_LIMIT','RECEIPT_EXCHANGE_EVENT_LIMIT']);
/** One successful range at most. Only recognized pre-publication acquisition limits may be retried. */
export async function scanPlatformExchange(options={}){
 const {provider,signal,acquisition='receipts',span=32,maxAttempts=14,totalTimeoutMs=45000,rpcTimeoutMs=15000,rpcMaxCalls=2200,...rest}=options;
 if(!['logs','receipts'].includes(acquisition)||!Number.isInteger(span)||span<1||span>(acquisition==='receipts'?32:2000)||!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>16||!Number.isInteger(totalTimeoutMs)||totalTimeoutMs<1||totalTimeoutMs>60000)throw new AdaptiveScanError('INVALID_ADAPTIVE_SCAN_BOUNDS');
 const controller=new AbortController(),abort=()=>controller.abort();
 signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 let expired=false;const timer=setTimeout(()=>{expired=true;controller.abort()},totalTimeoutMs);
 const attempts=[];let currentSpan=span,mode=acquisition;
 try{
  // This outer adapter enforces one shared RPC budget over all acquisition attempts.
  const shared=boundedExchangeRpc(provider,{signal:controller.signal,timeoutMs:rpcTimeoutMs,maxCalls:rpcMaxCalls});
  for(let index=0;index<maxAttempts;index++){
   try{
    const result=await syncPlatformExchange({...rest,provider:shared,signal:controller.signal,rpcTimeoutMs,rpcMaxCalls,span:currentSpan,acquisition:mode});
    attempts.push({span:currentSpan,acquisition:mode,result:result.idle?'idle':'published'});
    return {...result,attempts,policy:'At most one publication; acquisition-limit-only range reduction; no write retries or completeness/hosted acceptance implied'};
   }catch(error){
    // A deadline after commit starts must never relabel a storage failure or acknowledged success.
    if(expired&&error instanceof PlatformRpcError&&error.code==='RPC_CANCELLED')throw new AdaptiveScanError('SCAN_DEADLINE_EXCEEDED');
    const shrink=error instanceof ReceiptScanError&&receiptBounds.has(error.code)||error instanceof PlatformSyncError&&error.code==='DENSE_RANGE_REQUIRES_SMALLER_SPAN_OR_RECEIPTS';
    if(!shrink)throw error;
    attempts.push({span:currentSpan,acquisition:mode,result:error.code});
    if(currentSpan>1){currentSpan=Math.max(1,Math.floor(currentSpan/2));continue;}
    if(mode==='logs'){mode='receipts';continue;}
    throw new AdaptiveScanError('SINGLE_BLOCK_REQUIRES_REVIEWED_STAGING');
   }
  }
  throw new AdaptiveScanError('SCAN_ATTEMPTS_EXHAUSTED');
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}
