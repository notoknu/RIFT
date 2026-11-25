import {Interface,isAddress} from 'ethers';
import {createReadRpc,CRONOS_READ_ENDPOINTS} from './read-rpc.js';
const FIELDS=['name','totalMinted','maxSupply','mintPrice','walletLimit','txLimit','storageMode','owner','paused','start','end','merkleRoot','allowlistEnd'];
const hash=value=>typeof value==='string'&&/^0x[0-9a-f]{64}$/i.test(value);

// Retry an entire fixed-block snapshot, never individual fields across providers.
export async function loadDropSnapshot({address,abi,endpoints=CRONOS_READ_ENDPOINTS,createRpc=createReadRpc,signal}={}) {
  const cancelled=()=>{if(signal?.aborted){const error=Error('Collection read cancelled');error.name='AbortError';throw error;}};
  cancelled();
  if(!isAddress(address))throw Error('Invalid collection address');
  if(!Array.isArray(endpoints)||!endpoints.length||endpoints.length>3)throw Error('Invalid snapshot providers');
  const contract=new Interface(abi);
  let lastError;
  for(const endpoint of [...new Set(endpoints)]) {
    cancelled();
    const rpc=createRpc({endpoints:[endpoint]});
    const request=async args=>{cancelled();const value=await rpc.request(args);cancelled();return value;};
    const abort=()=>rpc.pause();
    signal?.addEventListener('abort',abort,{once:true});
    try {
      cancelled();
      const block=await request({method:'eth_blockNumber'});
      if(typeof block!=='string'||!/^0x[0-9a-f]+$/i.test(block))throw Error('Invalid snapshot block');
      const header=()=>request({method:'eth_getBlockByNumber',params:[block,false]});
      const before=await header();
      if(!hash(before?.hash)||typeof before.number!=='string'||BigInt(before.number)!==BigInt(block))throw Error('Snapshot block unavailable');
      const values={};let next=0,firstFailure;
      // Bound concurrency without placing all contract calls on the public RPC at once.
      const settled=await Promise.allSettled(Array.from({length:4},async()=>{
        while(next<FIELDS.length&&!firstFailure){
          cancelled();
          const field=FIELDS[next++];
          try{
            const data=await request({method:'eth_call',params:[{to:address,data:contract.encodeFunctionData(field)},block]});
            values[field]=contract.decodeFunctionResult(field,data)[0];
          }catch(error){firstFailure??=error;throw error;}
        }
      }));
      const failed=settled.find(result=>result.status==='rejected');
      if(failed)throw firstFailure||failed.reason;
      const after=await header();
      if(!hash(after?.hash)||after.hash.toLowerCase()!==before.hash.toLowerCase()||typeof after.number!=='string'||BigInt(after.number)!==BigInt(block))throw Error('Collection snapshot changed during read; reload required');
      cancelled();
      return {values,observation:{blockNumber:BigInt(block).toString(),blockHash:before.hash,provider:endpoint,scope:'One provider, fixed block, hash checked before/after; not finality or provider-truth certification'}};
    }catch(error){cancelled();if(error.terminal)throw error;lastError=error;}
    finally{signal?.removeEventListener('abort',abort);rpc.pause();}
  }
  throw Error('No consistent collection snapshot available. '+(lastError?.message||'Providers unavailable'));
}
