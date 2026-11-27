import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {readPrivateMaintenanceFile} from './maintenance-ops.js';
import {openDeliveryStore} from '../server/backup-delivery.js';
import {openOperationsState} from '../server/operations-state.js';
import {describeOperationsLanes,runOperationsCycle} from '../server/operations-supervisor.js';
const need=(v,c)=>{if(!v){const e=new Error(c);e.code=c;throw e}};
const json=async path=>JSON.parse((await readPrivateMaintenanceFile(path,32768)).toString('utf8'));
export async function runOperationsCommand(action,file,{signal,emit=value=>console.log(JSON.stringify(value))}={}){
 need(['init','describe','enroll','inspect','review','once','run'].includes(action),'OPERATIONS_ACTION_REQUIRED');const config=await json(file);
 if(action==='review'){need(config.version===1&&Object.keys(config).every(k=>['version','database','id','approval'].includes(k)),'INVALID_OPERATIONS_REVIEW');const state=await openOperationsState(config.database);try{return state.review(config.id,config.approval)}finally{state.close()}}
 const lanes=describeOperationsLanes(config);if(action==='describe')return {lanes:lanes.map(({id,kind,fingerprint})=>({id,kind,fingerprint})),activated:false};
 const state=await openOperationsState(config.database,{create:action==='init'});
 try{if(action==='init')return {initialized:true,enrolled:false,activated:false};if(action==='enroll')return {lanes:lanes.map(l=>state.enroll(l)),activated:false};if(action==='inspect'){const queues=[];for(const lane of lanes.filter(l=>l.kind==='delivery')){let store;try{store=await openDeliveryStore(lane.spec.outbox,{maxTotalBytes:lane.spec.maxTotalBytes});queues.push({id:lane.id,...store.status()})}catch{queues.push({id:lane.id,code:'DELIVERY_STATUS_UNAVAILABLE'})}finally{store?.close()}}return {lanes:state.inspect(),queues,activated:false}};if(action==='once')return await runOperationsCycle({config,state,signal});
  need(typeof process.getuid!=='function'||process.getuid()!==0,'OPERATIONS_NONROOT_REQUIRED');const database=config.database;let cycles=0;
  while(!signal?.aborted){const current=await json(file);need(current.database===database,'OPERATIONS_DATABASE_CHANGED');const result=await runOperationsCycle({config:current,state,signal});cycles++;emit(result);if(signal?.aborted)break;try{await delay(current.pollMs??5000,undefined,{signal})}catch(e){if(!signal?.aborted)throw e}}
  return {stopped:true,cycles,activated:false};
 }finally{state.close()}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const controller=new AbortController(),stop=()=>controller.abort();process.once('SIGTERM',stop);process.once('SIGINT',stop);try{need(process.argv.length===4,'USAGE_OPERATIONS_DAEMON_ACTION_PRIVATE_CONFIG');console.log(JSON.stringify(await runOperationsCommand(process.argv[2],resolve(process.argv[3]),{signal:controller.signal})))}catch(e){console.error(JSON.stringify({code:/^[A-Z0-9_]{1,80}$/.test(e.code||'')?e.code:'OPERATIONS_COMMAND_FAILED',activated:false}));process.exitCode=1}finally{process.removeListener('SIGTERM',stop);process.removeListener('SIGINT',stop)}}
