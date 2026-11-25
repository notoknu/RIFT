import {isAddress,getAddress,verifyMessage,hashMessage} from 'ethers';
import {validateIPFS,validateTraits} from './metadata.js';
import {profileDocument} from './profile-document.js';
const JSON_HEADERS={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
async function digest(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('')}
class Failure extends Error {constructor(status,message){super(message);this.status=status}}
const fail=(status,message)=>{throw new Failure(status,message)};
const address=value=>{if(typeof value!=='string'||!isAddress(value))fail(400,'Invalid Cronos address');return value.toLowerCase()};
const text=(v,max,name)=>{if(typeof v!=='string'||v.length>max)fail(400,'Invalid '+name);return v};
const uri=value=>{if(!value)return '';text(value,512,'artwork URI');try{validateIPFS(value);return value}catch{fail(400,'Artwork must use public ipfs:// content')}};
export async function boundedBytes(request,max){
 const length=request.headers.get('Content-Length');if(length&&Number(length)>max)fail(413,'Request body too large');
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();const chunks=[];let count=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;count+=value.length;if(count>max)fail(413,'Request body too large');chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}
 const out=new Uint8Array(count);let offset=0;for(const part of chunks){out.set(part,offset);offset+=part.length}return out;
}
async function json(request){if(!request.headers.get('Content-Type')?.startsWith('application/json'))fail(415,'application/json required');try{return JSON.parse(new TextDecoder().decode(await boundedBytes(request,32768)))}catch(e){if(e instanceof Failure)throw e;fail(400,'Invalid JSON')}}
function draftDocument(doc){
 if(!doc||typeof doc!=='object'||Array.isArray(doc))fail(400,'Draft document required');
 if(![0,1,2].includes(doc.mode))fail(400,'Unsupported storage mode');
 if(doc.svg!==undefined&&(typeof doc.svg!=='string'||new TextEncoder().encode(doc.svg).length>12000))fail(400,'Invalid draft SVG');
 const config=doc.config;if(!config||typeof config!=='object'||Array.isArray(config))fail(400,'Draft config required');
 const serialized=JSON.stringify({mode:doc.mode,config,svg:doc.svg||'',metadataOverrides:doc.metadataOverrides||{}});
 if(new TextEncoder().encode(serialized).length>24000)fail(413,'Draft exceeds 24 KiB. Artwork files/proofs stay on your device.');
 // Reject credentials anywhere in JSON keys, including nested objects.
 const check=value=>{if(!value||typeof value!=='object')return;for(const [key,v]of Object.entries(value)){if(/private.?key|seed.?phrase|mnemonic|password|jwt|api.?key|secret/i.test(key))fail(400,'Secrets must not be saved in drafts');check(v)}};check(doc);
 return serialized;
}
/** Portable Web Request/Response handler. D1 binding or localD1 adapter required.
 * chain.verify1271 and chain.register are injected and never accept client identity claims.
 */
export function createCreatorService({db,origin,chain,uploadProvider,uploadBytes=0,uploadFiles=0,sessionTransport='cookie',now=()=>Date.now(),logger=()=>{}}){
 if(!['cookie','bearer'].includes(sessionTransport))throw Error('Unsupported creator session transport');
 const bearer=sessionTransport==='bearer',sessionSeconds=bearer?3600:86400;
 const canonical=new URL(origin);if(canonical.origin!==origin||canonical.username||canonical.password||(!['https:'].includes(canonical.protocol)&&!['localhost','127.0.0.1'].includes(canonical.hostname)))throw Error('PUBLIC_ORIGIN must be an exact HTTPS origin (HTTP only for loopback development)');
 const secure=canonical.protocol==='https:',cookieName=secure?'__Host-rift_session':'rift_session_dev';
 const query=(sql,...params)=>db.prepare(sql).bind(...params);
 const cookie=(token,maxAge)=>`${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure?'; Secure':''}`;
 async function session(request){
  const token=bearer?request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1]:request.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  if(!token||!/^\w{64}$/.test(token))fail(401,'Sign in with your wallet first');
  const hash=await digest(token),s=await query('SELECT address,expires FROM creator_sessions WHERE hash=?',hash).first();
  if(!s||s.expires<=now())fail(401,'Wallet session expired');return {...s,hash};
 }
 const respond=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...headers}});
 async function handle(request){
  const url=new URL(request.url),path=url.pathname.replace(/\/$/,''),method=request.method;
  if(!path.startsWith('/api/v1/'))return null;
  try{
   if(!['GET','POST','PATCH','PUT','DELETE'].includes(method))fail(405,'Method not allowed');
   if(bearer){
    if(!secure||request.headers.get('Origin')!==origin)fail(403,'Exact HTTPS frontend origin required');
   }else if(method!=='GET'){
    if(request.headers.get('Origin')!==origin||request.headers.get('Sec-Fetch-Site')==='cross-site')fail(403,'Same-origin request required');
   }
   if(path==='/api/v1/auth/nonce'&&method==='POST'){
    const data=await json(request),wallet=address(data.address),nonce=random(),issued=now(),expires=issued+300000;
    const message=`${canonical.host} wants you to sign in with your Ethereum account:\n${getAddress(wallet)}\n\nSign in to RIFT on Cronos. This does not authorize transfers or spending.\n\nURI: ${origin}\nVersion: 1\nChain ID: 25\nNonce: ${nonce}\nIssued At: ${new Date(issued).toISOString()}\nExpiration Time: ${new Date(expires).toISOString()}`;
    await query('DELETE FROM creator_nonces WHERE nonce IN (SELECT nonce FROM creator_nonces WHERE expires<? LIMIT 100)',issued).run();
    const count=await query('SELECT COUNT(*) AS n FROM creator_nonces WHERE address=? AND expires>?',wallet,issued).first();if(count.n>=5)fail(429,'Too many wallet challenges; wait five minutes');
    const inserted=await query('INSERT INTO creator_nonces(nonce,address,message,expires) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM creator_nonces WHERE address=? AND expires>?)<5 RETURNING nonce',nonce,wallet,message,expires,wallet,issued).first();if(!inserted)fail(429,'Too many wallet challenges; wait five minutes');return respond({nonce,message,expiresAt:new Date(expires).toISOString(),chainId:25});
   }
   if(path==='/api/v1/auth/verify'&&method==='POST'){
    const data=await json(request);if(!/^[a-f0-9]{64}$/.test(data.nonce||''))fail(400,'Invalid nonce');
    if(typeof data.signature!=='string'||!/^0x[\da-f]+$/i.test(data.signature)||data.signature.length>8194)fail(400,'Invalid signature');
    const challenge=await query('UPDATE creator_nonces SET consumed=1 WHERE nonce=? AND consumed=0 AND expires>? RETURNING *',data.nonce,now()).first();
    if(!challenge)fail(401,'Challenge expired or already used');let valid=false;
    try{valid=verifyMessage(challenge.message,data.signature).toLowerCase()===challenge.address}catch{}
    if(!valid&&chain?.verify1271)valid=await chain.verify1271(challenge.address,hashMessage(challenge.message),data.signature);
    if(!valid)fail(401,'Invalid wallet signature');
    await query('DELETE FROM creator_sessions WHERE hash IN (SELECT hash FROM creator_sessions WHERE expires<? LIMIT 100)',now()).run();
    const sessions=await query('SELECT COUNT(*) AS n FROM creator_sessions WHERE address=?',challenge.address).first();if(sessions.n>=10)fail(429,'Too many active sessions; sign out or wait for expiry');
    const token=random(),inserted=await query('INSERT INTO creator_sessions SELECT ?,?,? WHERE (SELECT COUNT(*) FROM creator_sessions WHERE address=?)<10 RETURNING hash',await digest(token),challenge.address,now()+sessionSeconds*1000,challenge.address).first();if(!inserted)fail(429,'Too many active sessions');return bearer?respond({address:challenge.address,chainId:25,sessionToken:token,expiresAt:new Date(now()+sessionSeconds*1000).toISOString()}):respond({address:challenge.address,chainId:25},200, {'Set-Cookie':cookie(token,sessionSeconds)});
   }
   if(path==='/api/v1/auth/session'&&method==='GET'){const s=await session(request);return respond({address:s.address,chainId:25,expiresAt:new Date(s.expires).toISOString()})}
   if(path==='/api/v1/auth/logout'&&method==='POST'){const s=await session(request);await query('DELETE FROM creator_sessions WHERE hash=?',s.hash).run();return respond({ok:true},200,bearer?{}:{'Set-Cookie':cookie('',0)})}
   if(path==='/api/v1/auth/logout-all'&&method==='POST'){
    const s=await session(request),data=await json(request);
    if(!data||Object.keys(data).length!==1||data.confirm!=='REVOKE ACTIVE SESSIONS')fail(400,'Explicit session revocation confirmation required');
    await query('DELETE FROM creator_sessions WHERE address=?',s.address).run();
    return respond({ok:true,scope:'All currently stored sessions for this wallet revoked. Wallet connections and pending sign-in challenges are not revoked.'},200,bearer?{}:{'Set-Cookie':cookie('',0)});
   }
   if(path==='/api/v1/storage/capabilities'&&method==='GET'){
    const budget=await query('SELECT * FROM creator_budget WHERE id=1').first();return respond({provider:'Pinata public IPFS',uploadsEnabled:!!uploadProvider&&uploadBytes>0&&uploadFiles>0&&!budget.blocked,byteLimit:uploadBytes,fileLimit:uploadFiles,reservedBytes:budget.bytes,reservedFiles:budget.files,maxBatchFiles:32,maxBatchBytes:2097152,note:'Optional capped platform account; not per-wallet free storage. Quotas are conservative internal reservations, not provider account billing telemetry. Pin retention, gateway bandwidth and account eligibility remain operator responsibilities.'});
   }
   if(path==='/api/v1/launches'&&method==='GET'){
    const cursor=url.searchParams.get('cursor')||'~';if(cursor.length>80)fail(400,'Invalid cursor');const search=(url.searchParams.get('q')||'').toLowerCase();if(search.length>100)fail(400,'Search is too long');const rows=await query("SELECT c.*,p.title AS display_title,p.description AS display_description,p.image_uri AS display_image,p.banner_uri AS display_banner FROM creator_collections c LEFT JOIN creator_presentations p ON p.address=c.address WHERE NOT EXISTS(SELECT 1 FROM creator_visibility v WHERE v.address=c.address AND v.hidden=1) AND c.address<? AND (instr(lower(c.name),?)>0 OR instr(c.address,?)>0 OR instr(lower(COALESCE(p.title,'')),?)>0) ORDER BY c.address DESC LIMIT 25",cursor,search,search,search).all();return respond({collections:rows.results.slice(0,24),nextCursor:rows.results.length>24?rows.results[23].address:null,scope:'Registered launches from the configured RIFT factory; not the entire Cronos network'});
   }
   const publicCollection=path.match(/^\/api\/v1\/collections\/(0x[\da-fA-F]{40})$/);
   if(publicCollection&&method==='GET'){
    const a=address(publicCollection[1]);if(await query('SELECT address FROM creator_visibility WHERE address=? AND hidden=1',a).first())fail(451,'Collection hidden from RIFT registry after moderation review; on-chain ownership is unchanged');const row=await query('SELECT c.*,p.title AS display_title,p.description AS display_description,p.image_uri AS display_image,p.banner_uri AS display_banner FROM creator_collections c LEFT JOIN creator_presentations p ON p.address=c.address WHERE c.address=?',a).first();if(!row)fail(404,'Collection not registered with RIFT');return respond(row);
   }
   // All remaining supported routes require a session; no financial custody is taken.
   const known=/^\/api\/v1\/(profile(?:\/export)?|launch-drafts(?:\/[a-f0-9]{64})?|favorites(?:\/0x[\da-fA-F]{40})?|reports|launches\/register|collections\/0x[\da-fA-F]{40}\/presentation|uploads(?:\/[a-f0-9]{64}(?:\/files)?)?)$/;
   if(!known.test(path))return null;
   const s=await session(request);
   if(path==='/api/v1/profile/export'&&method==='GET'){
    const row=await query('SELECT version,document,updated FROM creator_profiles WHERE wallet=?',s.address).first();
    return respond({format:'rift-private-profile',formatVersion:1,exportedAt:new Date(now()).toISOString(),address:s.address,profile:row?{...JSON.parse(row.document),version:row.version,updated:row.updated}:null,scope:'Private profile data only. Not a wallet backup, full account export, or automatic restore package.'});
   }
   if(path==='/api/v1/profile'){
    if(method==='GET'){const row=await query('SELECT version,document,updated FROM creator_profiles WHERE wallet=?',s.address).first();return respond({address:s.address,profile:row?{...JSON.parse(row.document),version:row.version,updated:row.updated}:null,scope:'Private wallet-authenticated profile; not a public identity or ownership attestation'});}
    if(method==='PUT'){
     let parsed;try{parsed=profileDocument(await json(request))}catch(e){if(e instanceof Failure)throw e;fail(400,e.message)}
     const {version,document}=parsed;
     const saved=version===0?await query('INSERT INTO creator_profiles(wallet,version,document,updated) SELECT ?,1,?,? WHERE NOT EXISTS(SELECT 1 FROM creator_profiles WHERE wallet=?) RETURNING version',s.address,document,now(),s.address).first():await query('UPDATE creator_profiles SET version=version+1,document=?,updated=? WHERE wallet=? AND version=? RETURNING version',document,now(),s.address,version).first();
     if(!saved)fail(409,'Profile changed or missing; reload before saving');return respond({address:s.address,version:saved.version});
    }
    if(method==='DELETE'){const data=await json(request);if(!data||Object.keys(data).some(k=>k!=='version')||!Number.isSafeInteger(data.version)||data.version<1)fail(400,'Current profile version required');const removed=await query('DELETE FROM creator_profiles WHERE wallet=? AND version=? RETURNING version',s.address,data.version).first();if(!removed)fail(409,'Profile changed or missing; reload before deleting');return respond({ok:true});}
    fail(405,'Method not allowed');
   }
   if(path==='/api/v1/launch-drafts'){
    if(method==='GET'){const rows=await query('SELECT id,version,document,updated FROM creator_drafts WHERE wallet=? ORDER BY updated DESC,id LIMIT 50',s.address).all();return respond({drafts:rows.results.map(r=>({...r,document:JSON.parse(r.document)}))})}
    if(method==='POST'){const document=draftDocument(await json(request));const count=await query('SELECT COUNT(*) n FROM creator_drafts WHERE wallet=?',s.address).first();if(count.n>=50)fail(409,'Maximum 50 drafts per wallet');const id=random(),inserted=await query('INSERT INTO creator_drafts SELECT ?,?,1,?,? WHERE (SELECT COUNT(*) FROM creator_drafts WHERE wallet=?)<50 RETURNING id',id,s.address,document,now(),s.address).first();if(!inserted)fail(409,'Maximum 50 drafts per wallet');return respond({id,version:1},201)}
   }
   const draft=path.match(/^\/api\/v1\/launch-drafts\/([a-f0-9]{64})$/);
   if(draft){
    const row=await query('SELECT * FROM creator_drafts WHERE id=? AND wallet=?',draft[1],s.address).first();if(!row)fail(404,'Draft not found');
    if(method==='GET')return respond({id:row.id,version:row.version,document:JSON.parse(row.document)});
    if(method==='DELETE'){await query('DELETE FROM creator_drafts WHERE id=? AND wallet=?',row.id,s.address).run();return respond({ok:true})}
    if(method==='PATCH'){const data=await json(request),document=draftDocument(data.document);if(!Number.isInteger(data.version))fail(400,'Draft version required');const updated=await query('UPDATE creator_drafts SET document=?,version=version+1,updated=? WHERE id=? AND wallet=? AND version=? RETURNING version',document,now(),row.id,s.address,data.version).first();if(!updated)fail(409,'Draft changed elsewhere; reload before saving');return respond({id:row.id,version:updated.version})}
   }
   if(path==='/api/v1/favorites'&&method==='PUT'){
    const data=await json(request);if(!Array.isArray(data.addresses)||data.addresses.length>500)fail(400,'Merge at most 500 favorite addresses per request');const values=[...new Set(data.addresses.map(address))];
    await query('INSERT OR IGNORE INTO creator_favorites(wallet,address) SELECT ?,value FROM json_each(?) WHERE NOT EXISTS(SELECT 1 FROM creator_favorites WHERE wallet=? AND address=value) LIMIT MAX(0,1000-(SELECT COUNT(*) FROM creator_favorites WHERE wallet=?))',s.address,JSON.stringify(values),s.address,s.address).run();return respond({ok:true});
   }
   if(path==='/api/v1/favorites'&&method==='GET'){const rows=await query('SELECT address FROM creator_favorites WHERE wallet=? ORDER BY address LIMIT 1000',s.address).all();return respond({addresses:rows.results.map(r=>r.address)})}
   const favorite=path.match(/^\/api\/v1\/favorites\/(0x[\da-fA-F]{40})$/);
   if(favorite){const a=address(favorite[1]);if(method==='PUT'){const saved=await query('INSERT INTO creator_favorites SELECT ?,? WHERE (SELECT COUNT(*) FROM creator_favorites WHERE wallet=?)<1000 OR EXISTS(SELECT 1 FROM creator_favorites WHERE wallet=? AND address=?) ON CONFLICT(wallet,address) DO UPDATE SET address=excluded.address RETURNING address',s.address,a,s.address,s.address,a).first();if(!saved)fail(409,'Favorite limit reached');return respond({ok:true})}if(method==='DELETE'){await query('DELETE FROM creator_favorites WHERE wallet=? AND address=?',s.address,a).run();return respond({ok:true})}}
   if(path==='/api/v1/reports'&&method==='POST'){
    const data=await json(request),subject=address(data.subject),reason=text(data.reason,1000,'report reason').trim();if(reason.length<10)fail(400,'Describe the issue in at least 10 characters');const count=await query('SELECT COUNT(*) n FROM creator_reports WHERE wallet=? AND created>?',s.address,now()-86400000).first();if(count.n>=5)fail(429,'Daily report limit reached');const id=random(),inserted=await query('INSERT INTO creator_reports SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM creator_reports WHERE wallet=? AND created>?)<5 RETURNING id',id,s.address,subject,reason,now(),s.address,now()-86400000).first();if(!inserted)fail(429,'Daily report limit reached');return respond({id,status:'received-not-adjudicated'},201);
   }
   if(path==='/api/v1/launches/register'&&method==='POST'){
    if(!chain?.register)fail(503,'Reviewed factory is not configured');const data=await json(request);if(!/^0x[\da-f]{64}$/i.test(data.transactionHash||''))fail(400,'Invalid deployment transaction');
    const record=await chain.register(data.transactionHash,s.address);const existing=await query('SELECT creator FROM creator_collections WHERE address=?',record.address).first();if(existing){if(existing.creator!==s.address)fail(403,'Creator mismatch');return respond({address:record.address,alreadyRegistered:true})}
    await query('INSERT INTO creator_collections VALUES(?,?,?,?,?,?,?,?,?,?,?)',record.address,s.address,record.factory,data.transactionHash.toLowerCase(),record.block,record.name,record.contractURI,record.image||'',record.banner||'',record.description||'',now()).run();return respond({address:record.address},201);
   }
   const presentation=path.match(/^\/api\/v1\/collections\/(0x[\da-fA-F]{40})\/presentation$/);
   if(presentation&&method==='PATCH'){
    const a=address(presentation[1]),record=await query('SELECT creator FROM creator_collections WHERE address=?',a).first();if(!record||record.creator!==s.address)fail(403,'Only the registered original creator may change RIFT presentation');
    const data=await json(request),title=text(data.title||'',100,'title'),description=text(data.description||'',2000,'description'),image=uri(data.image),banner=uri(data.banner);
    await query('INSERT INTO creator_presentations VALUES(?,?,?,?,?,?) ON CONFLICT(address) DO UPDATE SET title=excluded.title,description=excluded.description,image_uri=excluded.image_uri,banner_uri=excluded.banner_uri,updated=excluded.updated',a,title,description,image,banner,now()).run();return respond({ok:true,note:'RIFT display only. Does not change immutable token metadata or certify authenticity.'});
   }
   if(path==='/api/v1/uploads'&&method==='POST'){
    if(!uploadProvider||uploadBytes<=0||uploadFiles<=0)fail(503,'Sponsored uploads disabled; bring your own public CIDs');const data=await json(request),bytes=data.bytes,files=data.files;
    if(!Number.isInteger(bytes)||bytes<1||bytes>2097152||!Number.isInteger(files)||files<1||files>32)fail(400,'Batch limit is 2 MiB and 32 files');
    const reserved=bytes+files*65536,budget=await query('UPDATE creator_budget SET bytes=bytes+?,files=files+? WHERE id=1 AND blocked=0 AND bytes+?<=? AND files+?<=? RETURNING id',reserved,files,reserved,uploadBytes,files,uploadFiles).first();if(!budget)fail(409,'Sponsored storage quota exhausted or paused');
    const id=random();await query('INSERT INTO creator_uploads(id,wallet,bytes,files,state,expires) VALUES(?,?,?,?,?,?)',id,s.address,reserved,files,'reserved',now()+900000).run();return respond({id,maxInputBytes:bytes,expiresAt:new Date(now()+900000).toISOString(),note:'Reservation is conservative and not automatically recycled; no previously pinned content will be unpinned to free quota.'},201);
   }
   const upload=path.match(/^\/api\/v1\/uploads\/([a-f0-9]{64})(\/files)?$/);
   if(upload){
    const row=await query('SELECT * FROM creator_uploads WHERE id=? AND wallet=?',upload[1],s.address).first();if(!row)fail(404,'Upload not found');
    if(!upload[2]&&method==='GET')return respond({id:row.id,state:row.state,cid:row.cid,error:row.error});
    if(upload[2]&&method==='PUT'){
     if(!uploadProvider)fail(503,'Upload provider disabled');if(row.state!=='reserved'||row.expires<=now())fail(409,'Upload allocation expired or already used');
     if(!request.headers.get('Content-Type')?.startsWith('multipart/form-data;'))fail(415,'Multipart files required');
     const bytes=await boundedBytes(request,2300000),form=await new Response(bytes,{headers:{'Content-Type':request.headers.get('Content-Type')}}).formData(),files=form.getAll('file');
     if(files.length!==row.files||[...form.keys()].some(k=>k!=='file'))fail(400,'File count does not match reservation');
     const names=new Set();let total=0;
     for(const file of files){
      if(typeof file==='string'||!file.name||!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,100}\.(?:png|jpg|jpeg|webp|json)$/i.test(file.name)||names.has(file.name))fail(400,'Use unique simple PNG/JPEG/WebP/JSON filenames');names.add(file.name);total+=file.size;
      const raw=new Uint8Array(await file.arrayBuffer()),ext=file.name.split('.').at(-1).toLowerCase();
      if(ext==='json'){let doc;try{doc=JSON.parse(new TextDecoder().decode(raw))}catch{fail(400,'Invalid metadata JSON')};if(typeof doc?.name!=='string')fail(400,'Metadata name required');uri(doc.image);if(!doc.image)fail(400,'IPFS metadata image required');if(doc.banner_image)uri(doc.banner_image);if(doc.animation_url)uri(doc.animation_url);if(doc.attributes!==undefined)try{validateTraits(doc.attributes)}catch(e){fail(400,e.message)}}
      else{const prefix=new TextDecoder().decode(raw.slice(0,12));const valid=ext==='png'?raw[0]===137&&prefix.slice(1,4)==='PNG':['jpg','jpeg'].includes(ext)?raw[0]===255&&raw[1]===216&&raw[2]===255:prefix.startsWith('RIFF')&&prefix.slice(8,12)==='WEBP';if(!valid)fail(400,'Image signature does not match extension')}
     }
     if(total>row.bytes-row.files*65536)fail(413,'Files exceed reserved input bytes');
     const claimed=await query("UPDATE creator_uploads SET state='uploading' WHERE id=? AND wallet=? AND state='reserved' AND expires>? RETURNING id",row.id,s.address,now()).first();if(!claimed)fail(409,'Upload already started');
     const normalized=files.map(file=>new File([file],file.name,{type:{png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',json:'application/json'}[file.name.split('.').at(-1).toLowerCase()]}));
     try{const result=await uploadProvider(normalized,{allocationId:row.id});validateIPFS('ipfs://'+result.cid+'/');if(!Number.isSafeInteger(result.size)||result.size>row.bytes){await query('UPDATE creator_budget SET blocked=1 WHERE id=1').run();throw Error('Provider size exceeds reserved budget; sponsorship paused for operator review')}
      await query("UPDATE creator_uploads SET state='pinned',cid=? WHERE id=?",result.cid,row.id).run();return respond({id:row.id,state:'pinned',directory:'ipfs://'+result.cid+'/',note:'Provider accepted a public folder pin. Verify retrieval and keep an independent local backup; no permanence guarantee.'});
     }catch(e){await query("UPDATE creator_uploads SET state='uncertain',error=? WHERE id=?",'Upload failed or result uncertain; operator reconciliation required',row.id).run();logger('upload-uncertain',e);fail(502,'Upload uncertain. Do not automatically retry: provider may already have pinned files. Contact operator with allocation ID.')}
    }
   }
   fail(405,'Method not supported for this route');
  }catch(e){if(!(e instanceof Failure))logger('creator-service-error',e);return respond({error:e instanceof Failure?e.message:'Creator service unavailable; retry later'},e.status||503)}
 }
 return {handle};
}
