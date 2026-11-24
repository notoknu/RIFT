// Same-origin frontend delivery. Never forward session cookies to static hosting.
const MAX_BYTES=8*1024*1024;
export function staticOrigin(value){const origin=new URL(value);if(origin.protocol!=='https:'||!origin.hostname.endsWith('.surge.sh')||origin.username||origin.password||origin.port||origin.origin!==value)throw Error('Expected exact HTTPS *.surge.sh origin');return origin}
export function frontendHeaders(response){const headers=new Headers(response.headers);headers.delete('Set-Cookie');headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin-when-cross-origin');headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: wss:; frame-src https://verify.walletconnect.com https://verify.walletconnect.org; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");return headers}
export async function frontendResponse(request,env,{fetcher=fetch,timeoutMs=10000,maxBytes=MAX_BYTES}={}){
 const url=new URL(request.url);
 if(url.pathname==='/healthz'||url.pathname==='/api'||url.pathname.startsWith('/api/'))return null;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 // Never publish source/configuration files, even if static hosting was misconfigured.
 let decoded;try{decoded=decodeURIComponent(url.pathname)}catch{return new Response('Invalid path',{status:400})}
 if(decoded.split('/').some(p=>p.startsWith('.')&&p!=='.well-known')||/\.(?:sqlite(?:-wal|-shm)?|db|pem|key|jks|keystore|map)$/i.test(decoded))return new Response('Not found',{status:404});
 if(env.SURGE_ORIGIN){
  let origin;try{origin=staticOrigin(env.SURGE_ORIGIN)}catch{return new Response('Invalid static origin configuration',{status:503})}
  const target=new URL(origin.origin);target.pathname=url.pathname;target.search=url.search;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);let reader;
  try{
   const response=await fetcher(target.href,{method:request.method,redirect:'manual',signal:controller.signal,headers:{Accept:request.headers.get('Accept')||'*/*'}});
   if(response.status>=300&&response.status<400)return new Response('Static host redirect refused',{status:502});
   const length=response.headers.get('content-length');if(length!==null&&Number(length)>maxBytes)return new Response('Static asset exceeds delivery limit',{status:502});
   const headers=new Headers();for(const key of ['content-type','etag','last-modified'])if(response.headers.has(key))headers.set(key,response.headers.get(key));headers.set('Cache-Control','no-cache');
   if(request.method==='HEAD'||response.status===204||response.status===304)return new Response(null,{status:response.status,headers:frontendHeaders({headers})});
   const aborted=new Promise((_,reject)=>{if(controller.signal.aborted)return reject(Error('Timeout'));controller.signal.addEventListener('abort',()=>reject(Error('Timeout')),{once:true})});
   const chunks=[];let bytes=0;
   if(response.body){reader=response.body.getReader();while(true){const part=await Promise.race([reader.read(),aborted]);if(part.done)break;bytes+=part.value.byteLength;if(bytes>maxBytes)return new Response('Static asset exceeds delivery limit',{status:502});chunks.push(part.value)}}
   const body=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength}
   return new Response(body,{status:response.status,headers:frontendHeaders({headers})});
  }catch{return new Response('Static host unavailable or timed out',{status:502})}finally{clearTimeout(timer);try{await reader?.cancel()}catch{}}
 }
 if(env.ASSETS){const response=await env.ASSETS.fetch(request);return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers:frontendHeaders(response)})}
 return null;
}
