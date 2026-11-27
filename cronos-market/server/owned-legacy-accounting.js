import {formatEther} from 'ethers';
import {orderKey} from '../shared/exchange.js';
import {validateProjectionSourceAcceptance,projectionPublicationHash} from './projection-publication.js';
import {validateMarketplaceProductionLineage} from './marketplace-production-lineage.js';
const need=(v,c)=>{if(!v)throw Object.assign(Error(c),{code:c})};
const exact=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...k].sort().join(',');
const addr=v=>typeof v==='string'&&/^0x[0-9a-f]{40}$/.test(v)&&!/^0x0{40}$/.test(v);
const uint=v=>{need(typeof v==='string'&&/^(?:0|[1-9][0-9]{0,77})$/.test(v)&&BigInt(v)<2n**256n,'LEGACY_ACCOUNTING_UINT_INVALID');return BigInt(v)};
/** Legacy projection loses buyer and individual block hashes. Never reconstruct
 * those identities, timestamps or live escrow state from an empty payload. */
export function accountOwnedLegacy({image,acceptance,acceptedSourceHash,rebuildLineage=null,now=Date.now()}={}){
 validateProjectionSourceAcceptance({image,acceptance,acceptedSourceHash,now});need(image.kind==='legacy-market','LEGACY_ACCOUNTING_IMAGE_REQUIRED');
 need(rebuildLineage===null||exact(rebuildLineage,['manifest','reviewedHash']),'LEGACY_ACCOUNTING_LINEAGE_INVALID');const lineage=rebuildLineage===null?null:validateMarketplaceProductionLineage({...rebuildLineage,image});
 const table=name=>{const t=image.tables.find(t=>t.name===name);need(t,'LEGACY_ACCOUNTING_TABLE_MISSING');return t.rows};
 const events=[...table('events')].sort((a,b)=>a.block-b.block||a.log_index-b.log_index),orders=new Map(),totals=new Map(),identities=new Set(),positions=new Set(),transactions=new Map();let gross=0n,fills=0;
 const metric=address=>{if(!totals.has(address)){need(totals.size<500,'LEGACY_ACCOUNTING_COLLECTION_LIMIT');totals.set(address,{address,gross:0n,fills:0})}return totals.get(address)};
 for(const e of events){
  need(Number.isSafeInteger(e.block)&&e.block>=image.binding.startBlock&&e.block<=acceptance.indexedThrough&&Number.isSafeInteger(e.log_index)&&e.log_index>=0&&/^0x[0-9a-f]{64}$/.test(e.tx||'')&&typeof e.id==='string'&&/^[0-9]{78}$/.test(e.id)&&orderKey(e.id)===e.id&&['Listed','Purchased','Cancelled'].includes(e.kind),'LEGACY_ACCOUNTING_EVENT_INVALID');
  const identity=e.tx+':'+e.log_index,position=e.block+':'+e.log_index;need(!identities.has(identity)&&!positions.has(position)&&(!transactions.has(e.tx)||transactions.get(e.tx)===e.block),'LEGACY_ACCOUNTING_EVENT_IDENTITY_CONFLICT');identities.add(identity);positions.add(position);transactions.set(e.tx,e.block);
  const p=JSON.parse(e.payload),prior=orders.get(e.id);
  if(e.kind==='Listed'){
   need(!prior&&exact(p,['seller','nft','tokenId','priceWei'])&&addr(p.seller)&&addr(p.nft),'LEGACY_ACCOUNTING_LISTING_INVALID');uint(p.tokenId);need(uint(p.priceWei)>0n,'LEGACY_ACCOUNTING_PRICE_INVALID');orders.set(e.id,{seller:p.seller,nft:p.nft,token_id:p.tokenId,price_wei:p.priceWei,active:1});metric(p.nft);
  }else{
   need(exact(p,[])&&prior?.active===1,'LEGACY_ACCOUNTING_MISSING_OR_CLOSED_ORDER');if(e.kind==='Purchased'){const value=uint(prior.price_wei),m=metric(prior.nft);m.gross+=value;m.fills++;gross+=value;fills++}prior.active=0;
  }
 }
 const stored=table('orders');need(stored.length===orders.size,'LEGACY_ACCOUNTING_ORDER_COUNT_MISMATCH');const checked=new Set();for(const row of stored){const expected=orders.get(row.id);need(expected&&!checked.has(row.id),'LEGACY_ACCOUNTING_STORED_ORDER_INVALID');checked.add(row.id);need(exact(row,['id','seller','nft','token_id','price_wei','active'])&&projectionPublicationHash({...expected,id:row.id})===projectionPublicationHash(row),'LEGACY_ACCOUNTING_ORDER_REPLAY_MISMATCH')}
 const collections=[...totals.values()].sort((a,b)=>a.address<b.address?-1:1).map(m=>({address:m.address,volumeAllCRO:formatEther(m.gross),grossWei:m.gross.toString(),filledUnits:String(m.fills),fillEvents:m.fills,volume24hCRO:null,volume7dCRO:null,sales24h:null,sales7d:null,floorCRO:null,activeListings:null}));
 return {format:'rift-owned-legacy-accounting-v1',chainId:25,model:'legacy',marketplace:image.binding.address,startBlock:image.binding.startBlock,indexedThrough:acceptance.indexedThrough,blockHash:acceptance.blockHash,imageDigest:projectionPublicationHash(image),acceptedSourceHash,rebuildLineage:lineage,observedAt:table('config')[0].updated_at,expiresAt:acceptance.expiresAt,timeEvidence:null,windowEndTimestamp:null,collections,totals:{grossWei:gross.toString(),grossCRO:formatEther(gross),filledUnits:String(fills),fillEvents:fills,orders:orders.size},sourceExclusions:acceptance.exclusions,scope:'Selected admitted legacy RIFT native-CRO deployment interval only. Purchase gross inferred from the preceding active listing, one NFT unit per purchase. Buyer/per-event hashes/timestamps were not retained: no buyer attribution or daily/weekly values are invented. Not net proceeds, profit, wash-trade filtering, whole-network volume, live floor, escrow ownership or settlement authority.',verified:false,activated:false};
}
