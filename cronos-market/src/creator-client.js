import {createCreatorTransport} from './creator-transport.js';
const transport=createCreatorTransport({origin:import.meta.env?.VITE_CREATOR_API_ORIGIN||''});
export const creatorRequest=transport.request;
export const forgetCreatorSession=transport.clear;
export async function signInCreator(connect){
 const signer=await connect(),address=await signer.getAddress();transport.clear();
 const challenge=await creatorRequest('/auth/nonce',{method:'POST',body:{address}});
 if(typeof challenge.message!=='string'||!challenge.message.startsWith(location.host+' wants you to sign in with your Ethereum account:')||!challenge.message.includes('\nURI: '+location.origin+'\nVersion: 1\nChain ID: 25\n'))throw Error('Unexpected sign-in origin or chain; refusing signature');
 const sessionEpoch=transport.currentEpoch(),signature=await signer.signMessage(challenge.message);
 return creatorRequest('/auth/verify',{method:'POST',body:{nonce:challenge.nonce,signature},sessionEpoch});
}
