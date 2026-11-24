import {isAddress} from 'ethers';import {validateIPFS} from './metadata.js';import {boundedBytes} from './creator-service.js';
export const OPS_SCHEMA=`CREATE TABLE IF NOT EXISTS creator_visibility(address TEXT PRIMARY KEY,hidden INTEGER NOT NULL,updated INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS creator_report_resolutions(id TEXT PRIMARY KEY,outcome TEXT NOT NULL,updated INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS creator_ops_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,action TEXT NOT NULL,subject TEXT NOT NULL,note TEXT NOT NULL,created INTEGER NOT NULL);`;
const q=(db,sql,...args)=>db.prepare(sql).bind(...args);
const noteText=note=>{if(typeof note!=='string'||note.trim().length<10||note.length>1000)throw Error('Operator note must be 10–1000 characters');return note};
async function audit(db,action,subject,note){await q(db,'INSERT INTO creator_ops_audit(action,subject,note,created) VALUES(?,?,?,?)',action,subject,noteText(note),Date.now()).run()}
// Operator-only module: never mounted as a public HTTP handler. Audit must succeed
// before a mutation; an attempted action may therefore appear without completion.
export async function visibility(db,address,hidden,note){if(!isAddress(address)||typeof hidden!=='boolean')throw Error('Invalid visibility');address=address.toLowerCase();await audit(db,hidden?'hide-attempt':'unhide-attempt',address,note);await q(db,'INSERT INTO creator_visibility VALUES(?,?,?) ON CONFLICT(address) DO UPDATE SET hidden=excluded.hidden,updated=excluded.updated',address,hidden?1:0,Date.now()).run();return {address,hidden}}
export async function resolveReport(db,id,outcome,note){if(!/^[a-f0-9]{64}$/.test(id)||!['actioned','dismissed'].includes(outcome))throw Error('Invalid report resolution');if(!await q(db,'SELECT id FROM creator_reports WHERE id=?',id).first())throw Error('Report not found');await audit(db,'resolve-attempt',id,note);await q(db,'INSERT INTO creator_report_resolutions VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET outcome=excluded.outcome,updated=excluded.updated',id,outcome,Date.now()).run();return {id,outcome}}
export async function listReports(db){return (await q(db,'SELECT r.*,s.outcome FROM creator_reports r LEFT JOIN creator_report_resolutions s ON s.id=r.id ORDER BY r.created DESC LIMIT 100').all()).results}
export async function listPins(jwt,{fetcher=fetch,maxPages=5}={}){
 if(!jwt)throw Error('Server Pinata credential required');if(!Number.isInteger(maxPages)||maxPages<1||maxPages>5)throw Error('Invalid provider page bound');const rows=[];
 for(let page=0;page<maxPages;page++){const url=new URL('https://api.pinata.cloud/data/pinList');url.searchParams.set('status','pinned');url.searchParams.set('pageLimit','100');url.searchParams.set('pageOffset',String(page*100));
  const response=await fetcher(url,{headers:{Authorization:'Bearer '+jwt},redirect:'error',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Pin inventory unavailable');const body=JSON.parse(new TextDecoder().decode(await boundedBytes(response,524288)));if(!Array.isArray(body.rows)||body.rows.length>100)throw Error('Invalid pin inventory');rows.push(...body.rows);if(body.rows.length<100)return {rows,complete:true};
 }return {rows,complete:false};
}
export async function reconcilePin(db,id,inventory,note,{now=Date.now()}={}){
 if(!/^[a-f0-9]{64}$/.test(id)||!inventory||!Array.isArray(inventory.rows))throw Error('Invalid reconciliation input');const row=await q(db,'SELECT * FROM creator_uploads WHERE id=?',id).first();if(!row)throw Error('Allocation not found');if(!['uncertain','uploading'].includes(row.state)||row.state==='uploading'&&row.expires>now)throw Error('Allocation is not eligible for reconciliation');
 const candidates=inventory.rows.filter(p=>p.metadata?.name==='RIFT-'+id&&!p.date_unpinned);if(candidates.length!==1)return {id,state:row.state,reconciled:false,reason:candidates.length?'Ambiguous provider matches':'No confirmed match; reservation retained. No retry or unpin performed.'};
 const pin=candidates[0],cid=pin.ipfs_pin_hash;validateIPFS('ipfs://'+cid+'/');if(!Number.isSafeInteger(pin.size)||pin.size<0)throw Error('Invalid provider size');
 await audit(db,'pin-reconcile-attempt',id,note);
 if(pin.size>row.bytes){await q(db,'UPDATE creator_budget SET blocked=1 WHERE id=1').run();throw Error('Provider storage exceeds reservation; new sponsorship paused')}
 const updated=await q(db,"UPDATE creator_uploads SET state='pinned',cid=?,error=NULL WHERE id=? AND state=? RETURNING id",cid,id,row.state).first();if(!updated)throw Error('Allocation changed during reconciliation');return {id,state:'pinned',cid,reconciled:true,note:'Existing pin recovered; reserved quota unchanged. No upload or unpin performed.'};
}
