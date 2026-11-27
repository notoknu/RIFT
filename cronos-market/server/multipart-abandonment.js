import {createHash} from 'node:crypto';
import {parseReservation,parseReservedCommit,deliveryReference} from './multipart-reservation.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
const need=(v,c)=>{if(!v){const e=new Error(c);e.code=c;throw e}};
const pin=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
/** Pure metadata planner. Caller supplies one transactionally consistent store view.
 * This is explicit abandoned-upload destruction, NOT attested backup retention. */
export function buildMultipartAbandonmentPlan({snapshot,read,target,reservationId,guard=()=>{}}){
 need(snapshot&&Array.isArray(snapshot.rows)&&snapshot.rows.length<=128&&typeof read==='function'&&typeof guard==='function'&&/^[A-Za-z0-9_-]{1,64}$/.test(target||'')&&pin(reservationId),'INVALID_MULTIPART_ABANDONMENT_SCOPE');
 const byId=new Map(snapshot.rows.map(r=>[r.id,r])),row=byId.get(reservationId);need(row&&row.target===target&&row.phase!=='sending','ABANDONMENT_RESERVATION_UNAVAILABLE');guard();const reservation=parseReservation(read(reservationId));
 const protectedParts=new Set(),opaqueRows=[];let readBytes=0;
 for(const r of snapshot.rows){guard();need(r.target===target,'ABANDONMENT_TARGET_MISMATCH');const body=read(r.id);readBytes+=body.length;need(readBytes<=536870912,'ABANDONMENT_READ_LIMIT');const magic=body.subarray(0,8).toString();
  if(magic==='RIFTRS01'&&r.id!==reservationId){try{for(const p of parseReservation(body).parts)protectedParts.add(deliveryReference(target,p.sha256))}catch{opaqueRows.push(r.id)}}
  if(magic==='RIFTCM01'||magic==='RIFTPM01'){let manifest=body;if(magic==='RIFTCM01'){let commit;try{commit=parseReservedCommit(body)}catch{need(false,'OPAQUE_COMMIT_BLOCKS_ABANDONMENT')}need(commit.reservationId!==reservationId,'COMMITTED_UPLOAD_CANNOT_BE_ABANDONED');manifest=commit.manifest}
   try{const data=JSON.parse(manifest.subarray(8))?.data;need(Array.isArray(data?.parts)&&data.parts.length>=1&&data.parts.length<=86&&data.parts.every(p=>pin(p.sha256)),'OPAQUE_ABANDONMENT_MANIFEST');for(const p of data.parts)protectedParts.add(deliveryReference(target,p.sha256))}catch{opaqueRows.push(r.id)}}
 }
 const selected=[row],preserved=[];
 for(const p of reservation.parts){guard();const key=deliveryReference(target,p.sha256),r=byId.get(key);if(!r)continue;if(protectedParts.has(key)||opaqueRows.length||r.phase==='sending'){preserved.push(key);continue}const body=read(key);need(r.digest===p.sha256&&r.bytes===p.bytes&&body.subarray(0,8).toString()==='RIFTPA01'&&body.subarray(8,32).equals(Buffer.alloc(24)),'ABANDONMENT_PART_CHANGED');need(r.phase===row.phase||row.phase!=='received'&&r.phase!=='received','ABANDONMENT_ROLE_CONFLICT');selected.push(r)}
 const unique=[...new Map(selected.map(r=>[r.id,r])).values()].sort((a,b)=>a.id.localeCompare(b.id)).map(({id,digest,bytes,phase})=>({id,digest,bytes,phase}));const data={format:'rift-orphan-multipart-abandonment-plan-v1',target,reservationId,stateDigest:snapshot.stateDigest,selected:unique,preservedParts:[...new Set(preserved)].sort(),opaqueRows:opaqueRows.sort(),logicalBytes:unique.reduce((n,r)=>n+r.bytes,0),scope:'Irreversible local abandonment of an uncommitted upload, not restore-certified retention. Fence producers, receivers and delivery workers; remote copies and retries are not cancelled.'};return {...data,planHash:sha(Buffer.from(JSON.stringify(data)))};
}
