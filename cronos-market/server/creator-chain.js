import {loadPublicChainProvider} from './public-chain-access.js';
import {Contract} from 'ethers';
import {readMetadata} from './wallet-assets.js';
import {verifyFactoryDeployment} from '../shared/verify-factory.js';
export async function verifyContractWallet(provider,wallet,hash,signature){
 if(await provider.getCode(wallet)==='0x')return false;
 try{return (await new Contract(wallet,['function isValidSignature(bytes32,bytes) view returns(bytes4)'],provider).isValidSignature(hash,signature)).toLowerCase()==='0x1626ba7e'}catch{return false}
}
export function creatorChain(env=process.env,{openProvider=loadPublicChainProvider}={}){
 const withProvider=async fn=>{const p=await openProvider({env});try{if((await p.getNetwork()).chainId!==25n)throw Error('Wrong chain');return await fn(p)}finally{p.destroy()}};
 return {
  verify1271:async(wallet,hash,signature)=>withProvider(p=>verifyContractWallet(p,wallet,hash,signature)),
  register:env.DROP_FACTORY_ADDRESS&&env.DROP_FACTORY_RUNTIME_HASH?async(tx,wallet)=>withProvider(p=>verifyFactoryDeployment({rpc:(method,params)=>p.send(method,params),readMetadata,factory:env.DROP_FACTORY_ADDRESS,runtimeHash:env.DROP_FACTORY_RUNTIME_HASH},tx,wallet)):undefined
 };
}
