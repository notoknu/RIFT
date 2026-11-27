import {loadWorkerChainAccess} from './worker-chain-access.js';
import {ChainReadError} from './chain-read-quorum.js';
const methods=['getNetwork','getBlockNumber','getBlock','getLogs','getCode','getBalance','getTransactionReceipt','call'];
const rpcMethods=new Set(['eth_chainId','eth_blockNumber','eth_getCode','eth_call','eth_getBalance','eth_getBlockByNumber','eth_getTransactionReceipt']);
/** Public-read ContractRunner. Failover is availability, NOT agreement on eth_call results.
 * No signer, transaction submission, wallet method or arbitrary RPC passthrough is exposed. */
export async function loadPublicChainProvider(options={}){
 let access;try{access=await loadWorkerChainAccess(options)}catch(e){if(e instanceof ChainReadError)throw e;throw new ChainReadError('PUBLIC_CHAIN_CONFIG_FAILED')}let closed=false;
 const check=()=>{if(closed)throw new ChainReadError('PUBLIC_CHAIN_READER_CLOSED')};
 async function run(method,args){check();try{const network=await access.provider.getNetwork();check();if(BigInt(network.chainId)!==25n)throw new ChainReadError('WRONG_CHAIN');const value=method==='getNetwork'?network:await access.provider[method](...args);check();return value}catch(e){if(e instanceof ChainReadError)throw e;throw new ChainReadError('PUBLIC_CHAIN_READ_FAILED')}}
 const runner={mode:access.mode==='single-provider'?'single-provider':'read-only-failover',assurance:'Read-only RPC observation; failover does not prove independent call-result agreement'};
 for(const method of methods)runner[method]=(...args)=>run(method,args);
 runner.send=(method,params)=>{check();if(!rpcMethods.has(method))return Promise.reject(new ChainReadError('READ_METHOD_FORBIDDEN'));return run('send',[method,params])};
 runner.destroy=()=>{if(closed)return;closed=true;access.close()};return Object.freeze(runner);
}
