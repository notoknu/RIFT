import {publicDataURL} from '../shared/public-data-providers.js';
import {publicDataFetch} from './public-data-fetch.js';
import {createPublicDataSnapshot} from './public-data-snapshot.js';
import {createRefreshResource} from './refresh-resource.js';
export function fold(v){return String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
function distance(a,b){if(Math.abs(a.length-b.length)>2)return 3;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=next}return prev[b.length]}
export function findCatalog(rows,q){let needle=fold(q),compact=needle.replaceAll(' ',''),tokens=needle.split(' ');return rows.map(r=>{let name=fold(r.name),slug=fold(r.slug),c=name.replaceAll(' ','');let score=name===needle||slug===needle?0:c===compact?1:name.startsWith(needle)?2:name.includes(needle)||c.includes(compact)?3:tokens.every(t=>name.includes(t)||slug.includes(t))?4:compact.length>=5&&compact.length<=64&&distance(c,compact)<=2?5:99;return{r,score}}).filter(x=>x.score<99).sort((a,b)=>a.score-b.score||String(a.r.name).localeCompare(String(b.r.name))).map(x=>x.r)}

export function createCatalogResource({env=process.env,fetcher=publicDataFetch,snapshot=createPublicDataSnapshot('search-catalog',['ebisu'],{env,maxBytes:4194304}),now=Date.now}={}){
 const validate=value=>{if(!value||!Array.isArray(value.rows)||value.rows.length>3000||typeof value.complete!=='boolean'||!Number.isFinite(Date.parse(value.updatedAt))||value.rows.some(r=>!r||r.chain!==25||!/^0x[0-9a-f]{40}$/i.test(r.address)))throw Error('Invalid catalog snapshot')};
 const load=async()=>{const deadline=now()+25000,rows=[],cursors=new Set();let cursor=null,complete=false;for(let page=0;page<30;page++){
  const remaining=deadline-now();if(remaining<=0)throw Error('Catalog deadline exceeded');const url=publicDataURL('ebisu','catalog',{chain:25,pageSize:100,...(cursor?{cursor}:{})},env),response=await fetcher(url,{signal:AbortSignal.timeout(Math.min(8000,remaining)),timeoutMs:Math.min(8000,remaining)});if(!response.ok)throw Error('Catalog unavailable');const body=await response.json();
  if(!Array.isArray(body.rows)||body.rows.length>100||typeof body.hasMore!=='boolean')throw Error('Invalid catalog page');rows.push(...body.rows.filter(r=>r.chain===25&&/^0x[0-9a-f]{40}$/i.test(r.address)));
  if(!body.hasMore){complete=true;break}if(typeof body.cursor!=='string'||!body.cursor||body.cursor.length>4096||cursors.has(body.cursor))throw Error('Invalid catalog cursor');cursors.add(body.cursor);cursor=body.cursor;
 }return {rows:[...new Map(rows.map(r=>[r.address.toLowerCase(),r])).values()],complete,updatedAt:new Date(now()).toISOString()}};
 const resource=createRefreshResource({load,validate,readSaved:snapshot.read,save:snapshot.save,now,ttlMs:3600000,staleMs:604800000,maxBytes:4194304});return {...resource,get(){snapshot.assertSelected?.();return resource.get()}};
}
const catalogResource=createCatalogResource();export const getCatalog=()=>catalogResource.get();
