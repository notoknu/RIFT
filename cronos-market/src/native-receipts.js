import {deviceReadClient} from './device-reads.js';import {workspaceAccount} from './device-workspace.js';
const hash=v=>typeof v==='string'&&/^0x[a-f0-9]{64}$/i.test(v),address=v=>typeof v==='string'&&/^0x[a-f0-9]{40}$/i.test(v);
export function receiptObservation(value,expectedHash){
 if(!value||value.cached!==false||value.chainId!==25||!hash(value.hash)||value.hash.toLowerCase()!==expectedHash.toLowerCase())throw Error('Native receipt identity/fresh-read scope mismatch');
 if(value.state==='not-found-or-pending')return null;
 if(!['included-success','included-reverted'].includes(value.state)||!address(value.from)||!hash(value.blockHash)||typeof value.block!=='string'||!/^0x(?:0|[1-9a-f][a-f0-9]*)$/i.test(value.block)||value.block.length>66)throw Error('Invalid native receipt observation');const block=BigInt(value.block);if(block>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Receipt block exceeds safe range');
 if(value.contractAddress!=null&&!address(value.contractAddress))throw Error('Invalid deployment address');return {hash:value.hash,from:value.from,status:value.state==='included-success'?1:0,blockNumber:Number(block),blockHash:value.blockHash,contractAddress:value.contractAddress||null,logs:[]};
}
/** Narrow adapter for manual journal reconciliation, NOT a general EIP-1193 provider.
 * Each actual receipt call verifies chain 25 natively and requires native consent.
 * No nonce scans, signing, resend, or cached-observation-as-current shortcut. */
export function nativeReceiptProvider(wallet,{bridge=globalThis.window?.RiftRead,signal,client=bridge?deviceReadClient(bridge):null}={}){
 const account=workspaceAccount(wallet);let halted=false;if(!client)throw Error('Native read channel unavailable');
 return {async getNetwork(){const status=await client.read('status',{}, {signal});if(status.chainId!==25||status.networkEnabled!==true)throw Error('Native network reads unavailable. Save Direct-read or Hybrid mode first.');return {chainId:25n}},async getTransactionReceipt(value){if(halted)throw Error('This native check stopped after a denial/error; start a fresh check explicitly');try{return receiptObservation(await client.read('receipt',{account,hash:value},{signal}),value)}catch(e){halted=true;throw e}}};
}
