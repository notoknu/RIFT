import {createWalletBlockReceiptQuorum} from './wallet-block-receipts.js';
import {createWalletEventQuorum} from './wallet-event-quorum.js';
import {createEventReadQuorum} from './chain-event-quorum.js';
import {createChainReadQuorum,ChainReadError} from './chain-read-quorum.js';
// Endpoint details stay server-side. Constructors are injected so transport/provider vendors are replaceable.
export function parseChainReadConfig(raw){
 const bad=()=>{throw new ChainReadError('INVALID_CHAIN_READ_CONFIG')};let config;
 try{if(typeof raw!=='string'||raw.length>16384)bad();config=JSON.parse(raw)}catch{bad()}
 if(config?.completeBlockEvents!==undefined&&typeof config.completeBlockEvents!=='boolean')bad();
 if(config?.completeBlockTransactionLimit!==undefined&&(!Number.isInteger(config.completeBlockTransactionLimit)||config.completeBlockTransactionLimit<256||config.completeBlockTransactionLimit>2048||config.completeBlockEvents!==true))bad();
 if(!config||config.version!==1||!Array.isArray(config.providers)||config.providers.length<2||config.providers.length>5)bad();
 const origins=new Set();
 const providers=config.providers.map(p=>{try{const url=new URL(p.url);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||origins.has(url.origin))bad();origins.add(url.origin);return {id:p.id,failureDomain:p.failureDomain,url:url.href}}catch{bad()}});
 // Core validation is shared; no connections or network reads during parsing.
 createChainReadQuorum({...config,providers:providers.map(p=>({...p,adapter:{getNetwork(){},getBlockNumber(){},getBlock(){}}}))});
 return {version:1,chainId:config.chainId??25,quorum:config.quorum??2,timeoutMs:config.timeoutMs??5000,maxHeadLag:config.maxHeadLag??24,completeBlockEvents:config.completeBlockEvents??false,...(config.completeBlockTransactionLimit===undefined?{}:{completeBlockTransactionLimit:config.completeBlockTransactionLimit}),providers};
}
export function openChainReadQuorum(raw,{createProvider,events=false}={}){
 if(typeof createProvider!=='function')throw new ChainReadError('PROVIDER_FACTORY_REQUIRED');
 const config=parseChainReadConfig(raw),opened=[];
 try{
  const providers=config.providers.map(p=>{const adapter=createProvider({url:p.url,chainId:config.chainId,timeoutMs:config.timeoutMs});opened.push(adapter);return {...p,adapter}});
  const reader=createChainReadQuorum({...config,providers}),eventReader=events?createEventReadQuorum({...config,providers}):null,walletReader=events?createWalletEventQuorum({...config,providers}):null,walletBlocks=events&&config.completeBlockEvents?createWalletBlockReceiptQuorum({...config,providers}):null;let closed=false;
  const close=()=>{if(closed)return;closed=true;for(const p of opened)try{p?.destroy?.()}catch{}};
  return {receiptLimits:Object.freeze({maxTransactions:config.completeBlockTransactionLimit??256}),...(walletBlocks?{readWalletCompleteBlock:query=>{if(closed)return Promise.reject(new ChainReadError('CHAIN_READER_CLOSED'));return walletBlocks.readWalletCompleteBlock(query)}}:{}),...(walletReader?{readWalletEvents:query=>{if(closed)return Promise.reject(new ChainReadError('CHAIN_READER_CLOSED'));return walletReader.readWalletEvents(query)}}:{}),readCheckpoint:n=>{if(closed)return Promise.reject(new ChainReadError('CHAIN_READER_CLOSED'));return reader.readCheckpoint(n)},readTimedCheckpoint:n=>{if(closed)return Promise.reject(new ChainReadError('CHAIN_READER_CLOSED'));return reader.readTimedCheckpoint(n)},diagnostics:reader.diagnostics,close,...(eventReader?{readEvents:query=>{if(closed)return Promise.reject(new ChainReadError('CHAIN_READER_CLOSED'));return eventReader.readEvents(query)},...(eventReader.readCompleteBlockEvents?{readCompleteBlockEvents:query=>{if(closed)return Promise.reject(new ChainReadError('CHAIN_READER_CLOSED'));return eventReader.readCompleteBlockEvents(query)}}:{})}:{})};
 }catch{for(const p of opened)try{p?.destroy?.()}catch{}throw new ChainReadError('PROVIDER_INITIALIZATION_FAILED')}
}
