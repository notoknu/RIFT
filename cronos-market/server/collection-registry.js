import {DatabaseSync} from 'node:sqlite';
import {existsSync} from 'node:fs';
import {createClient} from '@libsql/client/web';
import {isAddress,ZeroAddress} from 'ethers';
import {accountStorageConfig} from './account-storage-config.js';

export const REGISTRY_LIMIT=1000;
const QUERY='SELECT address,block FROM creator_collections ORDER BY address LIMIT 1001';
export function validateRegistryRows(rows){
 if(!Array.isArray(rows)||rows.length>REGISTRY_LIMIT)throw Error('Collection registry exceeds bounded admission capacity');
 const seen=new Set();return rows.map(row=>{
  if(!row||!isAddress(row.address)||row.address.toLowerCase()===ZeroAddress||!Number.isSafeInteger(row.block)||row.block<0)throw Error('Invalid registered collection identity or deployment block');
  const address=row.address.toLowerCase();if(seen.has(address))throw Error('Duplicate collection registry identity');seen.add(address);
  // The verified RIFT factory currently registers ERC721 drops only.
  return {address,startBlock:row.block,standard:'ERC-721'};
 });
}
/** Reads only the authoritative registry; never creates schema, writes rows or falls back remotely. */
export async function readRegisteredCollections(env=process.env,{clientFactory=createClient}={}){
 if(env.INDEX_REGISTERED_COLLECTIONS!=='1')return [];
 if((env.CREATOR_DB_DRIVER||'sqlite')==='libsql'){
  if(!accountStorageConfig(env).configured)throw Error('Remote collection registry configuration unavailable');
  let client;
  try{
   client=clientFactory({url:env.CREATOR_LIBSQL_URL,authToken:env.CREATOR_LIBSQL_AUTH_TOKEN,fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.any([init?.signal,AbortSignal.timeout(15000)].filter(Boolean))})});
   const result=await client.execute({sql:QUERY,args:[]});
   return validateRegistryRows(result.rows.map(row=>({address:row.address,block:typeof row.block==='bigint'&&row.block<=BigInt(Number.MAX_SAFE_INTEGER)?Number(row.block):row.block})));
  }catch{throw Error('Authoritative collection registry read failed; no local fallback used');}
  finally{client?.close();}
 }
 if((env.CREATOR_DB_DRIVER||'sqlite')!=='sqlite')throw Error('Unsupported collection registry driver');
 const path=env.CREATOR_DB||'data/creator.sqlite';if(!existsSync(path))return [];
 let db;try{db=new DatabaseSync(path,{readOnly:true});return validateRegistryRows(db.prepare(QUERY).all());}catch{throw Error('Local collection registry read failed');}finally{db?.close();}
}
