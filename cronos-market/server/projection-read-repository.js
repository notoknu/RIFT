import {openSqliteProjectionReadRepository} from './sqlite-projection-read-repository.js';
import {ProjectionReadError,requireProjectionRead as need} from '../shared/projection-read-contract.js';

/** Opt-in remote reads only; absent selection preserves SQLite, invalid selection
 * never silently falls back to a different dataset. No secret values in errors. */
export function configuredProjectionReadSelection({kind,binding,env=process.env}={}){
 let config={};const text=env.RIFT_PROJECTION_READ_CONFIG_JSON;
 if(text!==undefined){need(typeof text==='string'&&text.length<=262144,'PROJECTION_REMOTE_CONFIG_INVALID');try{config=JSON.parse(text)}catch{throw new ProjectionReadError('PROJECTION_REMOTE_CONFIG_INVALID')}}
 const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 need(object(config)&&Object.keys(config).every(k=>['collection','legacy-market','exchange'].includes(k)),'PROJECTION_REMOTE_CONFIG_INVALID');
 let selected=config[kind];
 if(kind==='collection'&&selected!==undefined){need(object(selected)&&Object.keys(selected).length<=1000&&Object.keys(selected).every(k=>/^0x[0-9a-f]{40}$/.test(k)),'PROJECTION_REMOTE_CONFIG_INVALID');selected=selected[binding.address.toLowerCase()]}
 if(selected===undefined)return {driver:'sqlite'};
 need(object(selected)&&Object.keys(selected).every(k=>['driver','url','approvedHost','authTokenEnv','readOnlyCredentialAcknowledged'].includes(k))&&selected.driver==='libsql'&&selected.readOnlyCredentialAcknowledged===true&&typeof selected.authTokenEnv==='string'&&/^[A-Z][A-Z0-9_]{0,127}$/.test(selected.authTokenEnv),'PROJECTION_REMOTE_CONFIG_INVALID');
 return selected;
}
export async function openConfiguredProjectionReadRepository({kind,path,binding,env=process.env}={}){
 const selected=configuredProjectionReadSelection({kind,binding,env});
 if(selected.driver==='sqlite')return openSqliteProjectionReadRepository({kind,path,binding});
 const {openLibsqlProjectionReadRepository}=await import('./libsql-projection-read-repository.js');
 return openLibsqlProjectionReadRepository({kind,binding,url:selected.url,approvedHost:selected.approvedHost,authToken:env[selected.authTokenEnv]});
}
