import {isAddress} from 'ethers';
const quota=v=>Number.isSafeInteger(Number(v))&&Number(v)>0;
const hash=v=>typeof v==='string'&&/^0x[0-9a-f]{64}$/i.test(v);
const address=v=>isAddress(v||'')&&!/^0x0{40}$/i.test(v);
function origin(v){try{const u=new URL(v);return u.origin===v&&u.protocol==='https:'&&!u.username&&!u.password}catch{return false}}
// Public, allowlisted operator configuration observations. Never a production certification.
export function buildReleaseManifest(env={}, {now=Date.now(),storageConfigured=false,uploadConfigured=false,runtime='node'}={}){
 const accountOrigin=origin(env.PUBLIC_ORIGIN);
 const profiles=accountOrigin&&storageConfigured;
 const exchange=address(env.EXCHANGE_ADDRESS)&&Number.isSafeInteger(Number(env.EXCHANGE_START_BLOCK))&&/^\d+$/.test(env.EXCHANGE_START_BLOCK||'')&&hash(env.EXCHANGE_RUNTIME_HASH);
 const uploads=profiles&&uploadConfigured&&quota(env.PIN_SPONSORED_BYTES)&&quota(env.PIN_SPONSORED_FILES);
 const commit=/^[a-f0-9]{40}$/i.test(env.WORKER_GIT_COMMIT||env.RENDER_GIT_COMMIT||'')?(env.WORKER_GIT_COMMIT||env.RENDER_GIT_COMMIT):null;
 return {runtime,schemaVersion:1,apiVersion:'v1',chainId:25,checkedAt:new Date(now).toISOString(),commit,releaseClass:'preview',productionApproved:false,
 features:[
  {id:'discovery',source:'implemented',runtime:'provider-dependent',blockers:['Coverage and freshness vary by source; not complete chain-wide discovery']},
  {id:'profiles',source:'implemented',runtime:profiles?'configured-not-accepted':'disabled',blockers:[...(!accountOrigin?['Exact HTTPS account origin missing']:[]),...(!storageConfigured?['Persistent account storage configuration missing']:[]),'Storage-provider durability, redeploy retention and recovery require acceptance']},
  {id:'uploads',source:'implemented',runtime:uploads?'configured-not-accepted':'disabled',blockers:['Requires account storage, pinning provider and finite quota; retention and abuse acceptance remain separate']},
  {id:'exchange',source:'implemented',runtime:exchange&&env.EXCHANGE_TRADING_ENABLED==='1'?'operator-enabled-not-accepted':'disabled',blockers:['Exact contract review, chain/runtime validation, index readiness and end-to-end wallet acceptance required']},
  {id:'native-wallet',source:'experimental-vault-no-signer',runtime:'not-production-approved',blockers:['Independent wallet review, real-device acceptance and protected release signing required']},
  {id:'launch',source:'implemented-partial-integrations',runtime:'wallet-and-provider-dependent',blockers:['Source verification requires provider acceptance; universal pin/marketplace integrations remain incomplete']}
 ],contracts:{exchange:exchange?env.EXCHANGE_ADDRESS:null,exchangeRuntimeHash:exchange?env.EXCHANGE_RUNTIME_HASH:null},
 evidence:{configurationOnly:true,tests:'Not inferred from source or environment flags',android:'Separate build and physical-device acceptance required',durability:'An operator flag is not proof of a persistent volume or successful restore'},
 scope:'Public configuration observations only. No secrets, database paths, account records or unverified production-readiness claims.'};
}
