import {createClient} from '@libsql/client/web';
import {CREATOR_SCHEMA} from '../shared/creator-schema.js';
import {accountStorageConfig} from './account-storage-config.js';
// Remote authoritative SQL only: never falls back to an ephemeral local account DB.
export async function remoteD1(env,{clientFactory=createClient}={}){
 if(env.CREATOR_DB_DRIVER!=='libsql'||!accountStorageConfig(env).configured)throw Error('Remote account storage is not configured');
 const client=clientFactory({url:env.CREATOR_LIBSQL_URL,authToken:env.CREATOR_LIBSQL_AUTH_TOKEN,fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.any([init?.signal,AbortSignal.timeout(15000)].filter(Boolean))})});
 try{await client.executeMultiple(CREATOR_SCHEMA)}catch{client.close();throw Error('Remote account schema initialization failed')}
 const object=(result,row)=>row?Object.fromEntries(result.columns.map((column,i)=>[column,row[i]])):null;
 return {close:()=>client.close(),prepare(sql){return {bind(...args){const execute=()=>client.execute({sql,args});return {
  async first(){const result=await execute();return object(result,result.rows[0])},
  async all(){const result=await execute();return {results:result.rows.map(row=>object(result,row))}},
  async run(){const result=await execute();return {meta:{changes:result.rowsAffected}}}
 }}}}};
}
