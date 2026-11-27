import {ChainReadError} from './chain-read-quorum.js';
/** Read-only compatibility runner; publication must separately require pinned header/event agreement. */
export function createFailoverReadProvider({providers,timeoutMs=5000,now=Date.now,cooldownMs=10000}={}){
 if(!Array.isArray(providers)||providers.length<2||providers.length>5||!providers.every(p=>p&&typeof p.getNetwork==='function')||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000||!Number.isInteger(cooldownMs)||cooldownMs<1||cooldownMs>60000)throw new ChainReadError('INVALID_FAILOVER_CONFIG');
 const states=providers.map(()=>({retryAt:0,wrongChain:false}));
 async function read(method,args){for(let i=0;i<providers.length;i++){const p=providers[i],s=states[i];if(s.wrongChain||now()<s.retryAt)continue;let timer;try{
  const result=await Promise.race([(async()=>{if(BigInt((await p.getNetwork()).chainId)!==25n){s.wrongChain=true;throw new ChainReadError('WRONG_CHAIN')}if(typeof p[method]!=='function')throw new ChainReadError('READ_METHOD_UNAVAILABLE');return method==='getNetwork'?{chainId:25n}:await p[method](...args)})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new ChainReadError('FAILOVER_TIMEOUT')),timeoutMs)})]);s.retryAt=0;return result;
 }catch(e){if(e?.code==='CALL_EXCEPTION'||e?.code==='INVALID_ARGUMENT'||e?.code===3)throw new ChainReadError('CHAIN_READ_REJECTED');s.retryAt=now()+cooldownMs}finally{clearTimeout(timer)}}throw new ChainReadError('CHAIN_READ_UNAVAILABLE')}
 const adapter={};for(const method of ['getNetwork','getBlockNumber','getBlock','getLogs','getCode','getBalance','getTransactionReceipt','call'])adapter[method]=(...args)=>read(method,args);
 adapter.send=(method,params)=>{if(!['eth_chainId','eth_blockNumber','eth_getCode','eth_call','eth_getBalance','eth_getBlockByNumber','eth_getTransactionReceipt'].includes(method))return Promise.reject(new ChainReadError('READ_METHOD_FORBIDDEN'));return read('send',[method,params])};
 adapter.diagnostics=()=>states.map((s,index)=>({index,wrongChain:s.wrongChain,retryInMs:Math.max(0,s.retryAt-now())}));return Object.freeze(adapter);
}
