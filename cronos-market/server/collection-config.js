import {existsSync,mkdirSync} from 'node:fs';import {DatabaseSync} from 'node:sqlite';import {isAddress} from 'ethers';
export function trackedCollections(env=process.env){
 let explicit=[];try{explicit=JSON.parse(env.COLLECTION_INDEXES_JSON||'[]')}catch{throw Error('Invalid COLLECTION_INDEXES_JSON')}
 if(!Array.isArray(explicit)||explicit.length>1000)throw Error('Maximum 1000 configured collection indexes');
 const rows=[...explicit];const registry=env.CREATOR_DB||'data/creator.sqlite';
 if(env.INDEX_REGISTERED_COLLECTIONS==='1'&&existsSync(registry)){const db=new DatabaseSync(registry,{readOnly:true});try{for(const row of db.prepare('SELECT address,block FROM creator_collections ORDER BY address LIMIT 1000').all())rows.push({address:row.address,startBlock:row.block,standard:'ERC-721'})}finally{db.close()}}
 const unique=new Map();for(const row of rows){if(!isAddress(row.address)||!Number.isSafeInteger(row.startBlock)||row.startBlock<0||!['ERC-721','ERC-1155'].includes(row.standard))throw Error('Each collection requires its real address, deployment block and standard');const address=row.address.toLowerCase();const prior=unique.get(address);if(prior&&(prior.startBlock!==row.startBlock||prior.standard!==row.standard))throw Error('Conflicting collection index configuration');unique.set(address,{address,startBlock:row.startBlock,standard:row.standard,path:row.path||(env.COLLECTION_INDEX_DIR||'data/collections')+'/'+address+'.sqlite'})}return [...unique.values()];
}
