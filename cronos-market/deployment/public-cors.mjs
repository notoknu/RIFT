import {creatorRoute} from '../shared/creator-routes.js';
// Default remains public-read-only. Bearer creator transport requires explicit opt-in.
export function publicReadCors(origin,{creatorBearer=false}={}){
 const u=new URL(origin);if(u.origin!==origin||u.protocol!=='https:'||u.username||u.password)throw Error('Exact HTTPS frontend origin required');
 if(typeof creatorBearer!=='boolean')throw Error('Explicit creator transport flag required');
 return(req,res,next)=>{
  if(req.headers.origin!==origin)return next();
  const path=req.path||req.url.split('?')[0];if(path!=='/healthz'&&!path.startsWith('/api/'))return next();
  res.vary('Origin');
  const method=req.method==='OPTIONS'?req.headers['access-control-request-method']:req.method;
  if(creatorBearer&&creatorRoute(path,method).owned){
   if(!creatorRoute(path,method).allowed)return res.status(405).end();
   const requested=String(req.headers['access-control-request-headers']||'').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
   if(requested.length>8||requested.some(h=>!['accept','content-type','authorization'].includes(h)))return res.status(403).end();
   res.setHeader('Access-Control-Allow-Origin',origin);
   if(req.method==='OPTIONS'){
    res.vary('Access-Control-Request-Method');res.vary('Access-Control-Request-Headers');
    res.setHeader('Access-Control-Allow-Methods',method);
    res.setHeader('Access-Control-Allow-Headers','Accept, Content-Type, Authorization');
    return res.status(204).end();
   }
   return next();
  }
  if(req.method==='OPTIONS'){
   if(!['GET','HEAD'].includes(method))return res.status(403).end();
   res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Methods','GET, HEAD');res.setHeader('Access-Control-Allow-Headers','Accept');return res.status(204).end();
  }
  if(!['GET','HEAD'].includes(req.method))return res.status(403).json({error:'Cross-origin writes disabled; use reviewed same-origin deployment or explicitly configured creator transport.'});
  res.setHeader('Access-Control-Allow-Origin',origin);next();
 };
}
