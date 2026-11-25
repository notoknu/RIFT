import {formatEther} from 'ethers';
const ADDRESS=/^0x[0-9a-fA-F]{40}$/;
const UINT_MAX=2n**256n-1n;
function wei(value){if(value===undefined||value===null)return null;if(typeof value!=='string'||!/^\d{1,78}$/.test(value)||BigInt(value)>UINT_MAX)throw Error('Invalid exact ranking amount');return BigInt(value).toString();}
const decimal=value=>value===null?null:formatEther(value);
function text(value,max){if(value===undefined||value===null)return '';if(typeof value!=='string'||value.length>max)throw Error('Invalid ranking text');return value;}
function count(value){if(value===undefined||value===null)return null;if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid ranking count');return value;}
function image(value){if(typeof value!=='string'||value.length>2048||/\s/.test(value))return null;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
function normalized(row){
 if(!row||typeof row!=='object'||row.chain?.name!=='CRONOS'||typeof row.address!=='string'||!ADDRESS.test(row.address))throw Error('Invalid Cronos collection');
 for(const key of ['volume','floorPrice'])if(row[key]!==undefined&&row[key]!==null&&(typeof row[key]!=='object'||Array.isArray(row[key])))throw Error('Invalid ranking metric object');
 return {address:row.address.toLowerCase(),name:text(row.name,180),description:text(row.description,6000),image:image(row.logo?.url),providerVerified:row.status==='VERIFIED',total:wei(row.volume?.volumeAllNative),week:wei(row.volume?.volume7dNative),floor:wei(row.floorPrice?.latestFloorPriceNative),owners:count(row.ownerCount),items:count(row.assetCount)};
}
function classify(row,overrides){
 const override=Object.hasOwn(overrides,row.address)?overrides[row.address]:null;
 if(override){if(typeof override.category!=='string'||!override.category||override.category.length>80||typeof override.source!=='string'||!override.source||override.source.length>300)throw Error('Reviewed category requires bounded category/source');return {category:override.category,categorySource:override.source};}
 const d=row.description.toLowerCase();const category=/\b(domain|domains|naming service)\b/.test(d)?'Domains':/\b(game|gaming|play-to-earn|gamefi)\b/.test(d)?'Gaming':/\b(pfp|pfps|profile picture|avatars?)\b/.test(d)?'PFP & avatars':/\b(membership|members-only|utility|staking)\b/.test(d)?'Utility & membership':/\b(art|artist|artwork|hand-drawn)\b/.test(d)?'Art & collectibles':'Uncategorized';
 return {category,categorySource:category==='Uncategorized'?null:'Automatically inferred from Minted description; not a verified classification'};
}
export function buildDirectory(nodes,overrides={}){
 if(!Array.isArray(nodes)||nodes.length>200||!overrides||typeof overrides!=='object'||Array.isArray(overrides))throw Error('Invalid bounded ranking input');
 const unique=new Map(),variants=new Map();let duplicateRows=0;
 for(const input of nodes){const row=normalized(input),prior=unique.get(row.address);if(!variants.has(row.address))variants.set(row.address,new Set());variants.get(row.address).add(JSON.stringify(row));
  if(prior){duplicateRows++;if(prior.total!==row.total||prior.week!==row.week)throw Error('Conflicting duplicate ranking metrics; refresh required');
   // No observation timestamps are supplied. Choose one complete normalized metadata row deterministically, never sum or claim latest.
   if(JSON.stringify(prior)<=JSON.stringify(row))continue;
  }
  unique.set(row.address,row);
 }
 const metadataConflicts=[...variants.values()].reduce((count,values)=>count+values.size-1,0);
 const compare=key=>(a,b)=>{const av=BigInt(a[key]||0),bv=BigInt(b[key]||0);return av===bv?(a.address<b.address?-1:a.address>b.address?1:0):av>bv?-1:1;};
 const all=[...unique.values()].filter(row=>BigInt(row.total||0)>0n).sort(compare('total')).slice(0,100),weekly=[...unique.values()].filter(row=>BigInt(row.week||0)>0n).sort(compare('week')).slice(0,100),union=new Map();
 for(const [rows,field] of [[all,'allTimeRank'],[weekly,'weeklyRank']])rows.forEach((row,index)=>{const collection=union.get(row.address)||{address:row.address,name:row.name||row.address,description:row.description,image:row.image,standard:'Not supplied',providerVerified:row.providerVerified,verificationSource:'Minted',volumeTotal:decimal(row.total),volume7d:decimal(row.week),floor:decimal(row.floor),currency:'CRO',owners:row.owners,items:row.items,allTimeRank:null,weeklyRank:null,...classify(row,overrides)};collection[field]=index+1;union.set(row.address,collection);});
 return {collections:[...union.values()],counts:{allTime:all.length,weekly:weekly.length},observations:{inputRows:nodes.length,uniqueRows:unique.size,duplicateRows,metadataConflicts,duplicatePolicy:'Conflicting rank metrics reject refresh; metadata chooses a deterministic complete row, not latest.'},source:'Minted public storefront',chainId:25,coverage:'Minted-only Cronos trading volume and listing floors, not network-wide. Positive-volume top100 per period among acquired rows; missing amounts remain unknown. Up to200 unique collections; ties ordered by address. Categories inferred unless reviewed. Provider pagination is not an atomic fixed-block snapshot.'};
}
