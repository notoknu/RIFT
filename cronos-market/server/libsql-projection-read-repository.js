import {createHash} from 'node:crypto';
import {projectionReferenceSchemaDigest} from './sqlite-projection-read-repository.js';
import {executeProjectionRead} from './projection-read-models.js';
import {ProjectionReadError,requireProjectionRead as need,validateProjectionBinding,normalizeProjectionQuery,projectionReadCapabilities} from '../shared/projection-read-contract.js';

/** Existing remote schemas only. No migrations, sync, writes or embedded replicas. */
export async function openLibsqlProjectionReadRepository({kind,binding,url,authToken,approvedHost,maxActive=4}={}){
 const admitted=validateProjectionBinding(kind,binding);const endpoint=validateProjectionRemoteConnection({url,authToken,approvedHost});
 need(Number.isInteger(maxActive)&&maxActive>=1&&maxActive<=8,'PROJECTION_CONCURRENCY_INVALID');
 const expected=projectionReferenceSchemaDigest(kind,admitted),{createClient}=await import('@libsql/client');
 const client=createClient({url:endpoint,authToken,intMode:'number'}),capabilities=projectionReadCapabilities(kind,{backend:'libsql'});let closed=false,active=0,closing;const drained=[];
 async function execute(method,raw){
  const query=normalizeProjectionQuery(kind,method,raw);need(!closed,'PROJECTION_REPOSITORY_CLOSING');need(active<maxActive,'PROJECTION_READ_BUSY');active++;let tx,primary,rolledBack=false;const deadline=Date.now()+15000;let statements=0;
  try{
   tx=await client.transaction('read');
   const port={async all(sql,args=[]){need(Date.now()<=deadline&&++statements<=64,'PROJECTION_READ_BUDGET_EXCEEDED');need(/^\s*SELECT\b/i.test(sql)&&Array.isArray(args),'PROJECTION_READ_PORT_INVALID');const result=await tx.execute({sql,args});need(Date.now()<=deadline,'PROJECTION_READ_BUDGET_EXCEEDED');return result.rows.map(row=>Object.fromEntries(result.columns.map(column=>[column,row[column]])))},async get(sql,args=[]){return (await this.all(sql,args))[0]}};
   const objects=await port.all("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name LIMIT 129");
   need(objects.length<=128&&createHash('sha256').update(JSON.stringify(objects)).digest('hex')===expected,'PROJECTION_SCHEMA_MISMATCH');
   const table=kind==='collection'?'collection_state':kind==='legacy-market'?'config':'exchange_state',state=await port.get('SELECT * FROM '+table+' WHERE id=1');
   need(state&&state.address===admitted.address&&state.start_block===admitted.startBlock&&(kind!=='collection'||state.standard===admitted.standard),'PROJECTION_BINDING_MISMATCH');
   const result=await executeProjectionRead(port,kind,admitted,method,query);await tx.rollback();rolledBack=true;return result;
  }catch(error){primary=error instanceof ProjectionReadError?error:new ProjectionReadError('PROJECTION_STORAGE_UNAVAILABLE','Remote projection read unavailable',{cause:error});throw primary}
  finally{let cleanupFailed=false;if(tx){if(!rolledBack)try{await tx.rollback()}catch{cleanupFailed=true}try{await tx.close()}catch{cleanupFailed=true}}active--;if(!active)for(const resolve of drained.splice(0))resolve();if(cleanupFailed){if(primary)primary.cleanupFailed=true;else throw new ProjectionReadError('PROJECTION_READ_CLEANUP_FAILED')}}
 }
 return Object.freeze({capabilities,...Object.fromEntries(capabilities.methods.map(method=>[method,q=>execute(method,q)])),close(){if(closing)return closing;closed=true;closing=Promise.resolve().then(async()=>{if(active)await new Promise(resolve=>drained.push(resolve));await client.close()});return closing}});
}

export function validateProjectionRemoteConnection({url,authToken,approvedHost}={}){
 let endpoint;try{endpoint=new URL(url)}catch{throw new ProjectionReadError('PROJECTION_REMOTE_CONFIG_INVALID')}
 need(typeof approvedHost==='string'&&approvedHost===approvedHost.toLowerCase()&&/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(approvedHost)&&!['.localhost','.local','.internal','.lan'].some(s=>approvedHost.endsWith(s))&&endpoint.hostname===approvedHost&&['https:','libsql:'].includes(endpoint.protocol)&&!endpoint.username&&!endpoint.password&&!endpoint.port&&['','/'].includes(endpoint.pathname)&&!endpoint.search&&!endpoint.hash&&typeof authToken==='string'&&authToken.length>=16&&authToken.length<=16384&&!/\s/.test(authToken),'PROJECTION_REMOTE_CONFIG_INVALID'); return endpoint.href;
}
