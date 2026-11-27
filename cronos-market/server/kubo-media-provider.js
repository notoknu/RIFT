import {randomBytes} from 'node:crypto';import {CID} from 'multiformats/cid';import {publicPost} from './public-post.js';import {MediaReplicationError} from './media-replication.js';
const need=(v,c)=>{if(!v)throw new MediaReplicationError(c)};
/** Concrete Kubo-compatible CAR import, recursive pin inspection and CAR export adapter. */
export function createKuboMediaProvider({id,failureDomain,apiUrl,authorization,requester=publicPost,timeoutMs=15000}={}){
 let base;try{base=new URL(apiUrl)}catch{throw new MediaReplicationError('INVALID_KUBO_CONFIG')}
 need(/^[-a-zA-Z0-9_]{1,64}$/.test(id||'')&&/^[-a-zA-Z0-9_]{1,64}$/.test(failureDomain||'')&&base.protocol==='https:'&&!base.username&&!base.password&&!base.search&&!base.hash&&(!base.port||base.port==='443')&&typeof requester==='function'&&Number.isInteger(timeoutMs)&&timeoutMs>=1&&timeoutMs<=60000,'INVALID_KUBO_CONFIG');
 const prefix=base.href.replace(/\/$/,'');
 const post=(method,options)=>requester(prefix+'/api/v0/'+method,{authorization,timeoutMs,...options});
 function rootOf(root){try{return CID.parse(root).toV1().toString()}catch{throw new MediaReplicationError('INVALID_MEDIA_CID')}}
 return {id,failureDomain,operatorEndpointOrigin:base.origin,async pinCar({root,archive,signal}){
  const cid=rootOf(root);need(Buffer.isBuffer(archive)&&archive.length<=8388608,'MEDIA_ARCHIVE_LIMIT');const boundary='rift-'+randomBytes(16).toString('hex');const body=Buffer.concat([Buffer.from('--'+boundary+'\r\nContent-Disposition: form-data; name="file"; filename="asset.car"\r\nContent-Type: application/vnd.ipld.car\r\n\r\n'),archive,Buffer.from('\r\n--'+boundary+'--\r\n')]);
  const response=await post('dag/import?pin-roots=true',{body,contentType:'multipart/form-data; boundary='+boundary,maxBytes:32768,signal});need(Buffer.isBuffer(response.bytes)&&response.bytes.length<=32768,'KUBO_IMPORT_ACK_REQUIRED');let roots;
  try{const lines=response.bytes.toString('utf8').trim().split(/\r?\n/);need(lines.length<=64,'KUBO_IMPORT_ACK_REQUIRED');roots=lines.map(line=>JSON.parse(line)).filter(r=>r.Root).map(r=>{need(!r.Root.PinErrorMsg,'KUBO_PIN_FAILED');return rootOf(r.Root.Cid?.['/'])})}catch{throw new MediaReplicationError('KUBO_IMPORT_ACK_REQUIRED')}need(roots.includes(cid),'KUBO_IMPORT_ROOT_MISMATCH');
  const pinned=await post('pin/ls?arg='+encodeURIComponent(cid)+'&type=recursive',{maxBytes:32768,signal});let keys;try{need(Buffer.isBuffer(pinned.bytes)&&pinned.bytes.length<=32768,'KUBO_PIN_NOT_CONFIRMED');keys=JSON.parse(pinned.bytes).Keys}catch{throw new MediaReplicationError('KUBO_PIN_NOT_CONFIRMED')}need(keys&&Object.entries(keys).some(([key,value])=>rootOf(key)===cid&&value?.Type==='recursive'),'KUBO_PIN_NOT_CONFIRMED');return {root:cid,recursivePinObserved:true,durableRetentionProven:false};
 },async readCar({root,maxBytes=8388608,signal}){need(Number.isInteger(maxBytes)&&maxBytes>=1&&maxBytes<=8388608,'MEDIA_READBACK_LIMIT');const response=await post('dag/export?arg='+encodeURIComponent(rootOf(root)),{maxBytes,signal});need(Buffer.isBuffer(response.bytes)&&response.bytes.length<=maxBytes,'MEDIA_READBACK_LIMIT');return Buffer.from(response.bytes)}};
}
