// Pairing URIs contain session secrets: never log, persist or send to link shorteners.
export function mobilePairingUri(uri,nowSeconds=Math.floor(Date.now()/1000)){
 if(typeof uri!=='string'||uri.length>4096||!/^wc:[a-f0-9]{64}@2\?/i.test(uri))return null;
 try{
  const params=new URLSearchParams(uri.slice(uri.indexOf('?')+1));
  const allowed=new Set(['relay-protocol','symKey','expiryTimestamp','relay-data']);
  for(const key of params.keys())if(!allowed.has(key)||params.getAll(key).length!==1)return null;
  if(params.get('relay-protocol')!=='irn'||!/^[a-f0-9]{64}$/i.test(params.get('symKey')||''))return null;
  if(params.has('expiryTimestamp')){const expiry=params.get('expiryTimestamp');if(!/^\d{1,12}$/.test(expiry)||Number(expiry)<=nowSeconds)return null;}
  if(/[\s\u0000-\u001f\u007f]/.test(uri))return null;
  return uri;
 }catch{return null;}
}
export async function copyPairingUri(uri,clipboard){
 if(!mobilePairingUri(uri))throw Error('Pairing expired or unavailable. Cancel and start a new connection.');
 if(typeof clipboard?.writeText!=='function')throw Error('Clipboard unavailable. Scan the QR code or open a mobile wallet.');
 try{await clipboard.writeText(uri)}catch{throw Error('Clipboard unavailable. Scan the QR code or open a mobile wallet.');}
}
