import {ownedPublicDataSelection} from '../shared/owned-public-data.js';
import {readEdgeOwnedPublicData} from './owned-public-data.js';
import {isAddress} from 'ethers';
import {collectionConfigs} from './collections.js';
/** A bounded transactional D1 read batch, never an RPC/production certificate. */
export async function edgeOperationalStatus(env){
 const jobs=[],indexes=[];
 const add=(kind,address,start,table)=>{if(!address)return;if(!isAddress(address)||/^0x0{40}$/i.test(address)||!/^\d+$/.test(String(start??''))||!Number.isSafeInteger(Number(start))){indexes.push({kind,status:'invalid'});return}jobs.push({kind,address:address.toLowerCase(),startBlock:Number(start),table})};
 add('legacy-market',env.MARKETPLACE_ADDRESS,env.MARKET_START_BLOCK,'edge_market_state');add('exchange-v2',env.EXCHANGE_ADDRESS,env.EXCHANGE_START_BLOCK,'edge_exchange_state');
 try{for(const c of collectionConfigs(env))jobs.push({...c,kind:'collection',table:'edge_collection_state'})}catch{indexes.push({kind:'collection-configuration',status:'invalid'})}
 const batch=jobs.slice(0,16);
 try{if(batch.length){const db=typeof env.DB.withSession==='function'?env.DB.withSession('first-primary'):env.DB;
  const results=await db.batch(batch.map(j=>j.kind==='collection'?db.prepare('SELECT * FROM edge_collection_state WHERE address=?').bind(j.address):db.prepare('SELECT * FROM '+j.table+' WHERE id=1')));
  for(let i=0;i<batch.length;i++){const j=batch[i],s=results[i].results[0],identity={kind:j.kind,...(j.kind==='collection'?{address:j.address}:{})};if(!s){indexes.push({...identity,status:'missing'});continue}
   const age=Number.isSafeInteger(s.updated)&&s.updated>0?Date.now()-s.updated:null,hash=s.block_hash??s.hash,validBinding=s.address===j.address&&s.start_block===j.startBlock&&(j.kind!=='collection'||s.standard===j.standard),validBlock=Number.isSafeInteger(s.last_block)&&s.last_block>=j.startBlock;
   const status=!validBinding||age!==null&&age<0?'invalid':s.rebuilding?'rebuilding':s.pending?'processing':!validBlock||age===null?'initializing':!/^0x[0-9a-f]{64}$/i.test(hash||'')?'invalid':age>600000?'stale':'fresh';
   indexes.push({...identity,backend:'d1',status,indexedThrough:Number.isSafeInteger(s.last_block)?s.last_block:null,blockHash:/^0x[0-9a-f]{64}$/i.test(hash||'')?hash:null,observedHead:Number.isSafeInteger(s.head)?s.head:null,caughtUp:Number.isSafeInteger(s.head)&&validBlock?s.last_block>=s.head-12:null,ageMs:age,lastError:s.error?'Index reports an error; inspect operator logs':null});
  }
 }}catch{indexes.push({kind:'d1-inspection',status:'unavailable'})}
 if(jobs.length>batch.length)indexes.push({kind:'projection-inspection-limit',status:'not-inspected',remaining:jobs.length-batch.length});
 try{if(ownedPublicDataSelection(env)){const data=await readEdgeOwnedPublicData(env);indexes.push({kind:'owned-public-data',status:'fresh',datasetId:data.datasetId,expiresAt:new Date(data.expiresAt).toISOString(),scope:'Hash-pinned operator publication; not independent semantic verification'})}}catch{indexes.push({kind:'owned-public-data',status:'unavailable'})}
 const status=!indexes.length?'unconfigured':indexes.every(i=>i.status==='fresh'&&i.caughtUp!==false&&!i.lastError)?'ok':'degraded';
 return Response.json({chainId:25,status,checkedAt:new Date().toISOString(),indexes,scope:'Configured D1 projection binding/checkpoint and stored freshness observations only; at most16 projections in one read batch. Not chain consensus, accepted-source certification, complete history, live ownership or trading approval.'},{status:status==='ok'?200:503,headers:{'Cache-Control':'no-store'}});
}
