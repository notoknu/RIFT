import {Interface,isAddress} from 'ethers';
export const EXCHANGE_ABI=[
 'event Listed(uint256 indexed id,address indexed seller,address indexed nft,uint256 tokenId,uint256 quantity,uint256 unitPrice,uint64 expiry,address buyer,bool multi)',
 'event Bought(uint256 indexed id,address indexed buyer,uint256 quantity,uint256 gross)',
 'event ListingCancelled(uint256 indexed id)',
 'event OfferMade(uint256 indexed id,address indexed buyer,address indexed nft,uint256 tokenId,uint256 quantity,uint256 unitPrice,uint64 expiry,uint8 scope,bytes32 root,bool multi)',
 'event OfferFilled(uint256 indexed id,address indexed seller,uint256 tokenId,uint256 quantity,uint256 gross)',
 'event OfferClosed(uint256 indexed id,uint256 refund)',
 'function list(address,uint256,uint256,uint256,uint64,address,bool) returns(uint256)',
 'function buy(uint256,uint256) payable','function buyBatch(uint256[],uint256[]) payable',
 'function cancelListing(uint256)','function makeOffer(address,uint256,uint256,uint256,uint64,uint8,bytes32,bool) payable returns(uint256)',
 'function acceptOffer(uint256,uint256,uint256,bytes32[])','function closeOffer(uint256)',
 'function withdrawTo(address payable)','function proceeds(address) view returns(uint256)',
 'function paused() view returns(bool)',
 'function filled721(uint256,uint256) view returns(bool)',
 'function listings(uint256) view returns(address seller,address nft,uint256 tokenId,uint256 unitPrice,uint256 remaining,uint64 expiry,address buyer,bool multi)',
 'function offers(uint256) view returns(address buyer,address nft,uint256 tokenId,uint256 unitPrice,uint256 remaining,uint64 expiry,uint8 scope,bytes32 root,bool multi)'
];
export const exchangeInterface=new Interface(EXCHANGE_ABI);
export const EXCHANGE_EVENTS=['Listed','Bought','ListingCancelled','OfferMade','OfferFilled','OfferClosed'];
export const uint=(value,{positive=false}={})=>{if(!/^\d{1,78}$/.test(String(value)))throw Error('Invalid integer');const n=BigInt(value);if(n>=2n**256n||positive&&n===0n)throw Error('Integer outside allowed range');return n};
export const orderKey=value=>uint(value).toString().padStart(78,'0');
export function decodeExchangeLog(log){
 const event=exchangeInterface.parseLog(log);if(!event||!EXCHANGE_EVENTS.includes(event.name))throw Error('Unknown exchange event');
 const a=event.args,payload={};for(const input of event.fragment.inputs){const v=a[input.name];payload[input.name]=typeof v==='bigint'?v.toString():typeof v==='string'&&isAddress(v)?v.toLowerCase():v}
 return {id:orderKey(a.id),type:event.name.startsWith('Offer')?'offer':'listing',kind:event.name,payload};
}
/** Pure event projection. No trust in a projection at settlement: always re-read chain. */
export function reduceExchange(order,event){
 const {kind,payload:p}=event;
 if(kind==='Listed'||kind==='OfferMade'){
  if(order)throw Error('Duplicate creation');
  return {...p,id:uint(p.id).toString(),remaining:uint(p.quantity,{positive:true}).toString()};
 }
 if(!order)throw Error('Missing order creation');
 if(kind==='Bought'||kind==='OfferFilled'){
  const remaining=uint(order.remaining),quantity=uint(p.quantity,{positive:true});if(quantity>remaining)throw Error('Order underflow');
  if(uint(p.gross)!==quantity*uint(order.unitPrice))throw Error('Incorrect fill value');
  return {...order,remaining:(remaining-quantity).toString()};
 }
 if(kind==='OfferClosed'&&uint(p.refund)!==uint(order.remaining)*uint(order.unitPrice))throw Error('Incorrect refund');
 return {...order,remaining:'0'};
}
