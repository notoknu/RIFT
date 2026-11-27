// Read-only adapter: no sends, signing, retries or provider failover.
export class PlatformRpcError extends Error{constructor(code){super(code);this.name='PlatformRpcError';this.code=code;}}
export function boundedExchangeRpc(provider,{signal,timeoutMs=15000,maxCalls=2200}={}){
 if(!provider||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000||!Number.isInteger(maxCalls)||maxCalls<1||maxCalls>5000)throw new PlatformRpcError('INVALID_RPC_BUDGET');
 let calls=0,stopped=false;
 const check=()=>{if(signal?.aborted)throw new PlatformRpcError('RPC_CANCELLED');if(stopped)throw new PlatformRpcError('RPC_BUDGET_STOPPED');};
 const adapter={check};
 for(const name of ['getNetwork','getBlockNumber','getBlock','getCode','getLogs','getTransactionReceipt'])adapter[name]=async(...args)=>{
  check();if(++calls>maxCalls){stopped=true;throw new PlatformRpcError('RPC_CALL_BUDGET_EXCEEDED')}
  let timer,onAbort;
  const gate=new Promise((_,reject)=>{timer=setTimeout(()=>{stopped=true;reject(new PlatformRpcError('RPC_DEADLINE_EXCEEDED'))},timeoutMs);onAbort=()=>{stopped=true;reject(new PlatformRpcError('RPC_CANCELLED'))};signal?.addEventListener('abort',onAbort,{once:true});if(signal?.aborted)onAbort();});
  // A non-cancellable ethers provider may continue its underlying read. Its late result is ignored;
  // the adapter stops admitting calls and the synchronizer will not publish that acquisition.
  try{const result=await Promise.race([Promise.resolve().then(()=>{check();return provider[name](...args)}),gate]);check();return result;}
  catch(error){stopped=true;if(error instanceof PlatformRpcError)throw error;throw new PlatformRpcError('RPC_READ_FAILED');}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort)}
 };
 return adapter;
}
