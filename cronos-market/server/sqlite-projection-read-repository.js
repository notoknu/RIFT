import {DatabaseSync} from 'node:sqlite';
import {openSync,closeSync,fstatSync,lstatSync,constants} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {CollectionIndex} from './collection-index.js';
import {MarketIndex} from './market-index.js';
import {ExchangeIndex} from './exchange-index.js';
import {executeProjectionRead} from './projection-read-models.js';
import {ProjectionReadError,requireProjectionRead as need,projectionReadCapabilities,validateProjectionBinding,normalizeProjectionQuery} from '../shared/projection-read-contract.js';

const constructors=Object.freeze({collection:CollectionIndex,'legacy-market':MarketIndex,exchange:ExchangeIndex});
const references=new Map();
const schema=db=>db.prepare("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name LIMIT 129").all().map(r=>({...r}));
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function projectionReferenceSchemaDigest(kind,binding){if(!references.has(kind)){const index=new constructors[kind]({...binding,path:':memory:'});try{references.set(kind,digest(schema(index.db)))}finally{index.close()}}return references.get(kind)}
function storageError(error){return error instanceof ProjectionReadError?error:new ProjectionReadError('PROJECTION_STORAGE_UNAVAILABLE','Projection storage unavailable',{cause:error})}
function verifyBinding(db,kind,binding){const table=kind==='collection'?'collection_state':kind==='legacy-market'?'config':'exchange_state',s=db.prepare('SELECT * FROM '+table+' WHERE id=1').get();need(s&&s.address===binding.address&&s.start_block===binding.startBlock&&(kind!=='collection'||s.standard===binding.standard),'PROJECTION_BINDING_MISMATCH')}
/** No public read constructs/migrates a target index. Each request owns a distinct
 * query-only read transaction; concurrent async requests cannot share a BEGIN. */
export function openSqliteProjectionReadRepository({kind,path,binding,maxActive=8}={}){
 const admitted=validateProjectionBinding(kind,binding);need(typeof path==='string'&&path.length>0&&path.length<=4096&&!path.includes('\0')&&path!==':memory:','PROJECTION_PATH_INVALID');need(Number.isInteger(maxActive)&&maxActive>=1&&maxActive<=64,'PROJECTION_CONCURRENCY_INVALID');const source=resolve(path),capabilities=projectionReadCapabilities(kind);let closed=false,active=0;const drained=[];
 async function execute(method,raw){
  const query=normalizeProjectionQuery(kind,method,raw);need(!closed,'PROJECTION_REPOSITORY_CLOSING');need(active<maxActive,'PROJECTION_READ_BUSY');active++;let db,fd,inTransaction=false,primaryError;
  try{const expected=projectionReferenceSchemaDigest(kind,admitted);fd=openSync(source,constants.O_RDONLY|constants.O_NOFOLLOW);const original=fstatSync(fd);need(original.isFile()&&original.nlink===1&&(original.mode&0o022)===0&&Number.isSafeInteger(original.size)&&original.size>0,'PROJECTION_STORAGE_UNSAFE');
   const check=()=>{const current=lstatSync(source);need(current.isFile()&&!current.isSymbolicLink()&&current.nlink===1&&(current.mode&0o022)===0&&current.dev===original.dev&&current.ino===original.ino,'PROJECTION_STORAGE_IDENTITY_CHANGED');for(const suffix of ['-wal','-shm','-journal']){let sidecar;try{sidecar=lstatSync(source+suffix)}catch(e){if(e.code==='ENOENT')continue;throw e}need(sidecar.isFile()&&!sidecar.isSymbolicLink()&&sidecar.nlink===1&&(sidecar.mode&0o022)===0,'PROJECTION_STORAGE_UNSAFE')}};
   check();db=new DatabaseSync(source,{readOnly:true});db.exec('PRAGMA query_only=ON;PRAGMA trusted_schema=OFF;PRAGMA busy_timeout=1000;PRAGMA cache_size=-8192;');db.exec('BEGIN');inTransaction=true;const objects=schema(db);need(objects.length<=128&&digest(objects)===expected,'PROJECTION_SCHEMA_MISMATCH');verifyBinding(db,kind,admitted);check();
   const port={get(sql,args=[]){check();need(/^\s*SELECT\b/i.test(sql)&&Array.isArray(args),'PROJECTION_READ_PORT_INVALID');return db.prepare(sql).get(...args)},all(sql,args=[]){check();need(/^\s*SELECT\b/i.test(sql)&&Array.isArray(args),'PROJECTION_READ_PORT_INVALID');return db.prepare(sql).all(...args)}};
   const result=await executeProjectionRead(port,kind,admitted,method,query);check();db.exec('ROLLBACK');inTransaction=false;return result;
  }catch(e){primaryError=storageError(e);throw primaryError}finally{const failures=[];if(db){if(inTransaction)try{db.exec('ROLLBACK')}catch(e){failures.push(e)}try{db.close()}catch(e){failures.push(e)}}if(fd!==undefined)try{closeSync(fd)}catch(e){failures.push(e)}active--;if(!active)for(const done of drained.splice(0))done();if(failures.length){if(primaryError)primaryError.cleanupFailed=true;else throw new ProjectionReadError('PROJECTION_READ_CLEANUP_FAILED')}}
 }
 return Object.freeze({capabilities,...Object.fromEntries(capabilities.methods.map(method=>[method,(query)=>execute(method,query)])),async close(){closed=true;if(active)await new Promise(done=>drained.push(done))}});
}
/** Existing explicit createIndex injection remains available as a compatibility
 * bridge, not a claim that the injected index is read-only or snapshot-isolated. */
export function openLegacyMarketIndexReadBridge({createIndex,options}){
 need(typeof createIndex==='function','PROJECTION_LEGACY_FACTORY_INVALID');const binding=validateProjectionBinding('legacy-market',options),index=createIndex({...options,...binding});need(index&&['page','get','close'].every(name=>typeof index[name]==='function'),'PROJECTION_LEGACY_FACTORY_INVALID');const capabilities=projectionReadCapabilities('legacy-market',{backend:'legacy-index-bridge',readOnly:false,consistentSnapshot:false});let closed=false;
 const invoke=async(method,q)=>{const query=normalizeProjectionQuery('legacy-market',method,q);need(!closed,'PROJECTION_REPOSITORY_CLOSING');try{if(method==='status'){need(typeof index.status==='function','PROJECTION_FEATURE_UNSUPPORTED');return await index.status()}return await index[method](query)}catch(e){throw storageError(e)}};
 return Object.freeze({capabilities,page:q=>invoke('page',q),get:q=>invoke('get',q),status:()=>invoke('status',{}),async close(){if(closed)return;closed=true;await index.close()}});
}
