import {creatorRoute} from './creator-routes.js';
// Portable Worker policy: only opted-in creator routes; never credentialed cookies.
export function creatorCrossOrigin(request,{origin,enabled=false}={}){
 if(!enabled)return {headers:{}};
 const path=new URL(request.url).pathname;
 const method=request.method==='OPTIONS'?request.headers.get('Access-Control-Request-Method'):request.method;
 const route=creatorRoute(path,method);if(!route.owned)return {headers:{}};
 const reject=status=>({response:Response.json({error:'Creator cross-origin policy rejected request'},{status})});
 let u;try{u=new URL(origin)}catch{return reject(503)}
 if(u.origin!==origin||u.protocol!=='https:'||u.username||u.password)return reject(503);
 if(request.headers.get('Origin')!==origin)return reject(403);
 if(!route.allowed)return reject(405);
 const list=(request.headers.get('Access-Control-Request-Headers')||'').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
 if(list.length>8||list.some(s=>!['accept','content-type','authorization'].includes(s)))return reject(403);
 const headers={'Access-Control-Allow-Origin':origin,Vary:'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'};
 if(request.method==='OPTIONS')return {response:new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':method,'Access-Control-Allow-Headers':'Accept, Content-Type, Authorization'}})};
 return {headers};
}
