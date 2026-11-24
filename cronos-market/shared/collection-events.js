import {Interface,ZeroAddress,isAddress} from 'ethers';import {uint,orderKey} from './exchange.js';
export const collectionEvents=new Interface([
 'event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)',
 'event TransferSingle(address indexed operator,address indexed from,address indexed to,uint256 id,uint256 value)',
 'event TransferBatch(address indexed operator,address indexed from,address indexed to,uint256[] ids,uint256[] values)'
]);
export const COLLECTION_TOPICS=['Transfer','TransferSingle','TransferBatch'].map(n=>collectionEvents.getEvent(n).topicHash);
export function decodeCollectionLog(log,standard){
 const event=collectionEvents.parseLog(log);if(!event)throw Error('Unknown collection event');const a=event.args;
 if(standard==='ERC-721'&&event.name!=='Transfer'||standard==='ERC-1155'&&event.name==='Transfer')throw Error('Collection standard mismatch');
 const from=a.from.toLowerCase(),to=a.to.toLowerCase();if(!isAddress(from)||!isAddress(to)||from===ZeroAddress&&to===ZeroAddress)throw Error('Invalid transfer endpoints');
 const ids=event.name==='Transfer'?[a.tokenId]:event.name==='TransferSingle'?[a.id]:a.ids;
 const values=event.name==='Transfer'?[1n]:event.name==='TransferSingle'?[a.value]:a[4];
 if(ids.length!==values.length||ids.length>10000)throw Error('Invalid transfer batch');
 return {kind:event.name,from,to,movements:ids.map((id,i)=>({id:uint(id).toString(),key:orderKey(id),quantity:uint(values[i]).toString()}))};
}
export function applyCollectionMovement(previous,{id,quantity},event,standard){
 const order=previous?{...previous,balances:{...previous.balances}}:{tokenId:String(id),standard,supply:'0',balances:{}};const q=uint(quantity),from=event.from.toLowerCase(),to=event.to.toLowerCase();
 if(order.standard!==standard||order.tokenId!==String(id))throw Error('Token projection mismatch');
 if(standard==='ERC-721'&&q!==1n)throw Error('Invalid ERC721 quantity');
 if(from===ZeroAddress){if(standard==='ERC-721'&&order.supply!=='0')throw Error('Duplicate ERC721 mint');order.supply=(BigInt(order.supply)+q).toString()}
 else {const held=BigInt(order.balances[from]||0);if(held<q)throw Error('Transfer history incomplete or inconsistent');order.balances[from]=(held-q).toString();if(order.balances[from]==='0')delete order.balances[from]}
 if(to===ZeroAddress){if(BigInt(order.supply)<q)throw Error('Burn underflow');order.supply=(BigInt(order.supply)-q).toString()}
 else order.balances[to]=(BigInt(order.balances[to]||0)+q).toString();
 if(standard==='ERC-721'&&Object.keys(order.balances).length>1)throw Error('ERC721 multiple owners');
 return order;
}
