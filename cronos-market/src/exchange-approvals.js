import {Contract,isAddress,ZeroAddress} from 'ethers';
import {uint} from '../shared/exchange.js';
import {verifiedExchange} from './exchange-client.js';
import {trackedTransaction} from './transactions.js';
const ABI=[
 'function supportsInterface(bytes4) view returns(bool)',
 'function getApproved(uint256) view returns(address)',
 'function ownerOf(uint256) view returns(address)',
 'function isApprovedForAll(address,address) view returns(bool)',
 'function approve(address,uint256)',
 'function setApprovalForAll(address,bool)',
];

export async function inspectExchangeApprovals(signer,{nft,tokenId='0',multi=false,exchangeAddress}={}) {
 if(!isAddress(nft))throw Error('Invalid NFT contract');
 if(typeof multi!=='boolean')throw Error('Select the NFT standard explicitly');
 const id=uint(tokenId),exchange=await verifiedExchange(signer,{exit:true,expectedAddress:exchangeAddress});
 const spender=await exchange.getAddress(),wallet=await signer.getAddress(),asset=new Contract(nft,ABI,signer);
 const block=await signer.provider.send('eth_blockNumber',[]);if(typeof block!=='string'||!/^0x[0-9a-f]+$/i.test(block))throw Error('Approval observation block unavailable');
 const at={blockTag:block};
 if(!await asset.supportsInterface(multi?'0xd9b67a26':'0x80ac58cd',at))throw Error('NFT standard mismatch');
 const collectionApproved=await asset.isApprovedForAll(wallet,spender,at);
 const approvedTo=multi?ZeroAddress:await asset.getApproved(id,at),tokenOwner=multi?null:await asset.ownerOf(id,at);
 return {nft,tokenId:id.toString(),multi,spender,wallet,blockNumber:BigInt(block).toString(),collectionApproved,tokenApproved:!multi&&tokenOwner.toLowerCase()===wallet.toLowerCase()&&approvedTo.toLowerCase()===spender.toLowerCase()};
}

export async function revokeExchangeApproval(signer,input,{scope,confirmAction=globalThis.confirm}={}) {
 if(!['token','collection'].includes(scope))throw Error('Invalid approval revocation scope');
 const current=await inspectExchangeApprovals(signer,input);
 if(scope==='token'&&(current.multi||!current.tokenApproved))throw Error('No matching token approval to revoke');
 if(scope==='collection'&&!current.collectionApproved)throw Error('No matching collection approval to revoke');
 const message=[
  'Revoke '+scope+' NFT approval on Cronos MAINNET?',
  'NFT contract: '+current.nft,
  'Wallet: '+current.wallet,
  'Exchange spender: '+current.spender,
  scope==='token'?'Token ID: '+current.tokenId:'This removes this spender’s operator approval for ALL of your tokens in this collection.',
  'Network gas is required. This does not cancel orders, close offers, withdraw CRO or return NFTs already held in escrow.',
  'Only the currently configured, runtime-verified RIFT exchange is supported here. Use your wallet to review older/custom spenders.',
 ].join('\n');
 if(!confirmAction(message))throw Error('Approval revocation declined');
 const fresh=await inspectExchangeApprovals(signer,input);
 if(fresh.wallet.toLowerCase()!==current.wallet.toLowerCase()||fresh.spender.toLowerCase()!==current.spender.toLowerCase())throw Error('Approval identity changed; review again');
 if(scope==='token'&&!fresh.tokenApproved||scope==='collection'&&!fresh.collectionApproved)throw Error('Approval changed; refresh before revoking');
 const asset=new Contract(current.nft,ABI,signer),method=scope==='token'?'approve':'setApprovalForAll',args=scope==='token'?[ZeroAddress,uint(current.tokenId)]:[current.spender,false];
 await asset[method].staticCall(...args);await asset[method].estimateGas(...args);
 return trackedTransaction('Revoke exchange '+scope+' approval',signer,()=>asset[method](...args),{nft:current.nft,tokenId:current.tokenId,spender:current.spender,scope});
}
