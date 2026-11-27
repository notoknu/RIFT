import {isAddress} from 'ethers';
import {orderKey} from './exchange.js';

const methods=Object.freeze({collection:Object.freeze(['status','page','owners','traits','activity']),'legacy-market':Object.freeze(['status','page','get']),exchange:Object.freeze(['status','page','order','activity'])});
export class ProjectionReadError extends Error{
 constructor(code,message=code,{cause}={}){super(message,{cause});this.name='ProjectionReadError';this.code=code}
}
export const requireProjectionRead=(condition,code='PROJECTION_QUERY_INVALID')=>{if(!condition)throw new ProjectionReadError(code)};
const need=requireProjectionRead;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const limit=(n,max)=>Number.isInteger(n)&&n>=1&&n<=max;
function uint(value){try{return orderKey(value)}catch{throw new ProjectionReadError('PROJECTION_QUERY_INVALID')}}
export function projectionReadCapabilities(kind,{backend='sqlite',readOnly=true,consistentSnapshot=true}={}){
 need(Object.hasOwn(methods,kind),'PROJECTION_KIND_UNSUPPORTED');need(typeof backend==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(backend)&&typeof readOnly==='boolean'&&typeof consistentSnapshot==='boolean','PROJECTION_CAPABILITIES_INVALID');
 return Object.freeze({version:1,kind,backend,chainId:25,readOnly,consistentSnapshot,methods:methods[kind],writes:false,liveSettlementAuthority:false});
}
export function assertProjectionReadRepository(repository,kind){
 const c=repository?.capabilities;need(c&&c.version===1&&c.kind===kind&&c.chainId===25&&c.writes===false&&c.liveSettlementAuthority===false&&typeof c.readOnly==='boolean'&&typeof c.consistentSnapshot==='boolean'&&typeof c.backend==='string'&&Array.isArray(c.methods)&&methods[kind]?.every(name=>c.methods.includes(name)&&typeof repository[name]==='function')&&typeof repository.close==='function'&&!('db' in repository)&&!('sync' in repository),'PROJECTION_REPOSITORY_CONTRACT_INVALID');return repository;
}
export function validateProjectionBinding(kind,raw){
 need(Object.hasOwn(methods,kind)&&object(raw)&&isAddress(raw.address||'')&&raw.address.toLowerCase()!=='0x'+'0'.repeat(40)&&Number.isSafeInteger(raw.startBlock)&&raw.startBlock>=0&&(raw.chainId===undefined||raw.chainId===25),'PROJECTION_BINDING_INVALID');
 if(kind==='collection')need(['ERC-721','ERC-1155'].includes(raw.standard),'PROJECTION_BINDING_INVALID');return Object.freeze({chainId:25,address:raw.address.toLowerCase(),startBlock:raw.startBlock,...(kind==='collection'?{standard:raw.standard}:{})});
}
export function normalizeProjectionQuery(kind,method,raw={}){
 need(Object.hasOwn(methods,kind)&&methods[kind].includes(method),'PROJECTION_FEATURE_UNSUPPORTED');if(method==='get'){uint(raw);return String(raw)}need(object(raw));
 if(method==='status'||method==='traits'){need(Object.keys(raw).length===0);return {}}
 let q;
 if(kind==='collection'){
  if(method==='page'){need(Object.keys(raw).every(k=>['cursor','limit','owner','traitType','traitValue'].includes(k)));q={cursor:raw.cursor,limit:raw.limit??12,owner:raw.owner,traitType:raw.traitType,traitValue:raw.traitValue};need(limit(q.limit,24)&&(!q.owner||isAddress(q.owner))&&(q.traitType===undefined||typeof q.traitType==='string'&&q.traitType.length<=100)&&(q.traitValue===undefined||typeof q.traitValue==='string'&&q.traitValue.length<=300));if(q.cursor!=null)uint(q.cursor)}
  else if(method==='owners'){need(Object.keys(raw).every(k=>['cursor','limit'].includes(k)));q={cursor:raw.cursor??'',limit:raw.limit??24};need(typeof q.cursor==='string'&&(!q.cursor||isAddress(q.cursor))&&limit(q.limit,48))}
  else{need(Object.keys(raw).every(k=>['cursor','limit'].includes(k)));q={cursor:raw.cursor,limit:raw.limit??24};need(limit(q.limit,48)&&(!q.cursor||typeof q.cursor==='string'&&/^\d{1,15}:\d{1,10}$/.test(q.cursor)))}
 }else if(kind==='legacy-market'){
  need(Object.keys(raw).every(k=>['cursor','seller','nft','limit'].includes(k)));q={cursor:raw.cursor,seller:raw.seller,nft:raw.nft,limit:raw.limit??24};need(limit(q.limit,48)&&(!q.seller||isAddress(q.seller))&&(!q.nft||isAddress(q.nft)));if(q.cursor!==undefined){need(typeof q.cursor==='string'&&/^\d{1,78}$/.test(q.cursor));uint(q.cursor)}
 }else if(method==='page'){
  need(Object.keys(raw).every(k=>['type','cursor','account','nft','limit','includeClosed'].includes(k)));q={type:raw.type??'listing',cursor:raw.cursor,account:raw.account,nft:raw.nft,limit:raw.limit??24,includeClosed:raw.includeClosed??false};need(['listing','offer'].includes(q.type)&&limit(q.limit,48)&&typeof q.includeClosed==='boolean'&&(!q.account||isAddress(q.account))&&(!q.nft||isAddress(q.nft)));if(q.cursor!=null)uint(q.cursor);
 }else if(method==='order'){
  need(Object.keys(raw).every(k=>['type','id'].includes(k)));q={type:raw.type??'listing',id:raw.id};need(['listing','offer'].includes(q.type));uint(q.id);
 }else{
  need(Object.keys(raw).every(k=>['nft','cursor','limit'].includes(k)));q={nft:raw.nft,cursor:raw.cursor,limit:raw.limit??24};need(isAddress(q.nft||'')&&limit(q.limit,48)&&(!q.cursor||typeof q.cursor==='string'&&/^\d{1,15}:\d{1,10}$/.test(q.cursor)));
 }
 return q;
}
export function projectionReadHttpStatus(error){return error instanceof ProjectionReadError&&error.code==='PROJECTION_QUERY_INVALID'?400:503}
/** One initialized repository per slot. Closing drains admitted operations, then
 * permits a later clean reopen; failed initialization is never cached forever. */
export function createProjectionRepositorySlot({kind,open,maxActive=16}){
 need(Object.hasOwn(methods,kind)&&typeof open==='function'&&Number.isInteger(maxActive)&&maxActive>=1&&maxActive<=64,'PROJECTION_SLOT_INVALID');let current=null,opening=null,closing=null,active=0;const drained=[];
 const initialize=()=>{if(current)return Promise.resolve(current);if(!opening)opening=Promise.resolve().then(open).then(async repository=>{try{current=assertProjectionReadRepository(repository,kind);return current}catch(e){await repository?.close?.();throw e}}).finally(()=>{opening=null});return opening};
 return {async use(fn){need(typeof fn==='function','PROJECTION_SLOT_INVALID');need(!closing,'PROJECTION_REPOSITORY_CLOSING');need(active<maxActive,'PROJECTION_READ_BUSY');active++;try{return await fn(await initialize())}finally{active--;if(!active)for(const resolve of drained.splice(0))resolve()}},close(){if(closing)return closing;closing=Promise.resolve().then(async()=>{if(active)await new Promise(resolve=>drained.push(resolve));const repository=current;current=null;if(repository)await repository.close()}).finally(()=>{closing=null});return closing}};
}
