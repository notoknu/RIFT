import {isAddress} from 'ethers';
const uint=value=>{const s=String(value);if(!/^\d{1,78}$/.test(s)||BigInt(s)>=2n**256n)throw Error('Invalid listing ID');return BigInt(s)};
/** Direct contract state is authoritative for execution; indexed visibility is a delayed observation. */
export async function authoritativeLegacyListing(contract,id,{wallet,action,expected}={}){
 const order=await contract.listings(uint(id));if(!order.active||!isAddress(order.seller)||!isAddress(order.nft))throw Error('Listing is no longer active. Refresh listings.');
 if(!isAddress(wallet))throw Error('Invalid action wallet');const mine=order.seller.toLowerCase()===wallet.toLowerCase();if(action==='cancel'&&!mine)throw Error('Only the authoritative listing seller can cancel');if(action==='buy'&&mine)throw Error('Cannot buy your own listing');
 if(expected&&(expected.nft?.toLowerCase()!==order.nft.toLowerCase()||uint(expected.tokenId)!==BigInt(order.tokenId)||BigInt(expected.priceWei??0)!==BigInt(order.price)))throw Error('Listing identity/price changed. Refresh before continuing.');return order;
}
export async function authoritativeExchangeExit(contract,id,wallet,method){if(!isAddress(wallet))throw Error('Invalid action wallet');const offer=method==='closeOffer';if(!offer&&method!=='cancelListing')throw Error('Invalid order exit');const order=await contract[offer?'offers':'listings'](uint(id));if(BigInt(order.remaining)<=0n)throw Error('Order is already closed');if((offer?order.buyer:order.seller)?.toLowerCase()!==wallet.toLowerCase())throw Error('Wallet does not own the authoritative order');return order;}
