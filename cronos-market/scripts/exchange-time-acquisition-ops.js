import {JsonRpcProvider,FetchRequest} from 'ethers';
import {readTimeAcquisitionJSON,initializeExchangeTimeAcquisition,advanceExchangeTimeAcquisition} from '../server/exchange-time-acquisition.js';
import {inspectExchangeTimeAcquisition} from '../server/exchange-time-acquisition-inspection.js';
import {parseChainReadConfig,openChainReadQuorum} from '../server/chain-read-config.js';
import {projectionPublicationHash} from '../server/projection-publication.js';
const need=(v,c)=>{if(!v)throw Object.assign(Error(c),{code:c})};
const exact=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...k].sort().join(',');
let reader;
try{
 need(process.argv.length===3,'TIME_ACQUIRE_CONFIG_REQUIRED');const c=await readTimeAcquisitionJSON(process.argv[2],65536);need(c?.version===1&&['initialize','advance','inspect'].includes(c.action),'TIME_ACQUIRE_CONFIG_INVALID');
 if(c.action==='inspect'){need(exact(c,['version','action','directory','planDigest','receiptDigest']),'TIME_ACQUIRE_CONFIG_INVALID');console.log(JSON.stringify(await inspectExchangeTimeAcquisition(c),null,2))}
 else{
 const fields=['version','action','directory','imagePath','chainConfigPath',...(c.action==='initialize'?['lifetimeMs']:['planDigest','maxSamples','timeoutMs'])];need(exact(c,fields),'TIME_ACQUIRE_CONFIG_INVALID');
 const image=await readTimeAcquisitionJSON(c.imagePath,9437184),raw=JSON.stringify(await readTimeAcquisitionJSON(c.chainConfigPath,16384)),policy=parseChainReadConfig(raw);need(policy.chainId===25&&policy.timeoutMs<=10000,'TIME_ACQUIRE_POLICY_INVALID');const providerPolicyDigest=projectionPublicationHash(policy);
 if(c.action==='initialize')console.log(JSON.stringify(await initializeExchangeTimeAcquisition({directory:c.directory,image,providerPolicyDigest,lifetimeMs:c.lifetimeMs}),null,2));
 else{
  // Explicit advance only. Initialization and inspection never construct RPC adapters.
  reader=openChainReadQuorum(raw,{createProvider:({url,timeoutMs})=>{const request=new FetchRequest(url);request.timeout=timeoutMs;return new JsonRpcProvider(request)}});
  console.log(JSON.stringify(await advanceExchangeTimeAcquisition({directory:c.directory,image,planDigest:c.planDigest,providerPolicyDigest,reader,quorum:policy.quorum,maxSamples:c.maxSamples,timeoutMs:c.timeoutMs}),null,2));
 }
 }
}catch(e){console.error(JSON.stringify({code:/^(TIME_ACQUIRE_|CHAIN_|RPC_|INVALID_CHAIN_|WRONG_CHAIN|PROJECTION_)[A-Z_]*$/.test(e.code||'')?e.code:'EXCHANGE_TIME_ACQUISITION_FAILED',sourceApproved:false,verified:false,activated:false,scope:'Partial local artifacts may remain. Preserve them; do not infer source approval or repeat into an overwritten directory.'}));process.exitCode=2}finally{reader?.close()}
