import {createFailoverReadProvider} from './chain-read-failover.js';
import {open,constants} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {JsonRpcProvider,FetchRequest} from 'ethers';
import {parseChainReadConfig,openChainReadQuorum} from './chain-read-config.js';
import {ChainReadError} from './chain-read-quorum.js';
const need=(v,c)=>{if(!v)throw new ChainReadError(c)};
const factory=({url,timeoutMs})=>{const request=new FetchRequest(url);request.timeout=timeoutMs;return new JsonRpcProvider(request)};
/** Explicit config selection; absence preserves existing single-RPC behavior. Never silently downgrades invalid quorum config. */
export async function loadWorkerChainAccess({env=process.env,createProvider=factory}={}){
 if(!env.RIFT_CHAIN_READ_CONFIG){const provider=createProvider({url:env.CRONOS_RPC_URL||'https://evm.cronos.org',timeoutMs:12000});return {provider,options:{},mode:'single-provider',close:()=>provider.destroy?.()}}
 const path=env.RIFT_CHAIN_READ_CONFIG;need(isAbsolute(path),'ABSOLUTE_CHAIN_CONFIG_REQUIRED');let f,raw;
 try{f=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);const s=await f.stat();need(s.isFile()&&s.size>0&&s.size<=16384&&(s.mode&0o077)===0,'PRIVATE_CHAIN_CONFIG_REQUIRED');const data=Buffer.alloc(s.size+1);const r=await f.read(data,0,data.length,0);need(r.bytesRead===s.size,'CHAIN_CONFIG_CHANGED');raw=data.subarray(0,s.size).toString('utf8')}finally{await f?.close()}
 return openConfiguredChainAccess(raw,{createProvider});
}
export function validateConfiguredChainAccess(raw){
 let parsed;try{parsed=JSON.parse(raw)}catch{throw new ChainReadError('INVALID_CHAIN_READ_CONFIG')}
 const config=parseChainReadConfig(raw),primary=config.providers.find(p=>p.id===parsed.primaryId);need(primary&&config.chainId===25,'CHAIN_PRIMARY_REQUIRED');return {...config,primaryId:primary.id};
}
export function openConfiguredChainAccess(raw,{createProvider=factory}={}){
 const config=validateConfiguredChainAccess(raw),primary=config.providers.find(p=>p.id===config.primaryId);let provider;const opened=[];
 const reader=openChainReadQuorum(raw,{events:true,createProvider:opts=>{const adapter=createProvider(opts);opened.push(adapter);if(opts.url===primary.url)provider=adapter;return adapter}});
 return {provider:createFailoverReadProvider({providers:[provider,...opened.filter(p=>p!==provider)],timeoutMs:config.timeoutMs}),options:{span:16,chainReader:reader,eventReader:reader,walletEventReader:reader},mode:'independent-header-and-events',close:reader.close};
}
