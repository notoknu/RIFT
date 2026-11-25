import {isAbsolute} from 'node:path';
export function accountStorageConfig(env=process.env){
 const driver=env.CREATOR_DB_DRIVER||'sqlite';
 if(driver==='libsql'){
  let url;try{url=new URL(env.CREATOR_LIBSQL_URL||'')}catch{return {driver,configured:false}}
  const valid=['libsql:','https:'].includes(url.protocol)&&url.hostname.endsWith('.turso.io')&&url.hostname!=='.turso.io'&&!url.username&&!url.password&&!url.port&&['','/'].includes(url.pathname)&&!url.search&&!url.hash;
  const token=env.CREATOR_LIBSQL_AUTH_TOKEN;
  return {driver,configured:valid&&typeof token==='string'&&token.length>=16&&!/\s/.test(token)};
 }
 if(driver!=='sqlite')return {driver:'unsupported',configured:false};
 return {driver,configured:env.CREATOR_STORAGE_PERSISTENT==='1'&&isAbsolute(env.CREATOR_DB||'')};
}
