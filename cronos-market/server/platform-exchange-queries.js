import {isAddress} from 'ethers';
import {orderKey} from '../shared/exchange.js';
// Called inside one SDK read transaction by PlatformExchangeStore.
export function validateOrderPage({type='listing',cursor,account,nft,limit=24,includeClosed=false,revision}={}){
 if(!['listing','offer'].includes(type)||!Number.isInteger(limit)||limit<1||limit>48||typeof includeClosed!=='boolean'||account!==undefined&&!isAddress(account)||nft!==undefined&&!isAddress(nft)||revision!==undefined&&(!Number.isSafeInteger(revision)||revision<0))throw Error('INVALID_PAGE_QUERY');
 let key;if(cursor!==undefined){try{key=orderKey(cursor)}catch{throw Error('INVALID_PAGE_CURSOR')}}
 return {type,key,account:account?.toLowerCase(),nft:nft?.toLowerCase(),limit,includeClosed,revision};
}
export function validateActivityPage({nft,cursor,limit=24,revision}={}){
 if(!isAddress(nft||'')||!Number.isInteger(limit)||limit<1||limit>48||revision!==undefined&&(!Number.isSafeInteger(revision)||revision<0)||cursor!==undefined&&(typeof cursor!=='string'||!/^\d{1,15}:\d{1,10}$/.test(cursor)))throw Error('INVALID_ACTIVITY_QUERY');
 let position;if(cursor!==undefined){position=cursor.split(':').map(Number);if(!position.every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('INVALID_ACTIVITY_CURSOR')}
 return {nft:nft.toLowerCase(),position,limit,revision};
}
export async function queryOrderPage(db,stream,q,seconds){
 const conditions=['stream=?','type=?'],args=[stream,q.type];
 if(!q.includeClosed){conditions.push('active=1','(expiry=0 OR expiry>?)');args.push(seconds)}
 if(q.key!==undefined){conditions.push('order_id<?');args.push(q.key)}
 if(q.account){conditions.push('account=?');args.push(q.account)}if(q.nft){conditions.push('nft=?');args.push(q.nft)}
 const rows=(await db.execute({sql:'SELECT document FROM rift_exchange_orders WHERE '+conditions.join(' AND ')+' ORDER BY order_id DESC LIMIT ?',args:[...args,q.limit+1]})).rows;
 const items=rows.slice(0,q.limit).map(r=>JSON.parse(r.document));return {items,nextCursor:rows.length>q.limit?items.at(-1).id:null};
}
export async function queryActivity(db,stream,q){
 const conditions=['e.stream=?','o.nft=?'],args=[stream,q.nft];
 if(q.position){conditions.push('(e.block<? OR (e.block=? AND e.log_index<?))');args.push(q.position[0],q.position[0],q.position[1])}
 const rows=(await db.execute({sql:'SELECT e.* FROM rift_exchange_events e JOIN rift_exchange_orders o ON o.stream=e.stream AND o.type=e.type AND o.order_id=e.order_id WHERE '+conditions.join(' AND ')+' ORDER BY e.block DESC,e.log_index DESC LIMIT ?',args:[...args,q.limit+1]})).rows;
 const items=rows.slice(0,q.limit).map(r=>({transactionHash:r.tx,logIndex:Number(r.log_index),block:Number(r.block),blockHash:r.block_hash,type:r.type,id:BigInt(r.order_id).toString(),kind:r.kind,...JSON.parse(r.payload)}));
 return {items,nextCursor:rows.length>q.limit?items.at(-1).block+':'+items.at(-1).logIndex:null};
}
