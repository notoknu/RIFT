import {creatorRoute} from '../shared/creator-routes.js';
import {isAbsolute} from 'node:path';
import express from 'express';
import {localD1} from './local-d1.js';
import {createCreatorService} from '../shared/creator-service.js';
import {pinataProvider} from '../shared/pinata-provider.js';
import {creatorChain} from './creator-chain.js';
export function creatorAPIPlugin({env=process.env}={}){
 let service;
 return {name:'creator-account-api',configureServer(server){
  const router=express.Router();
  const raw=express.raw({type:()=>true,limit:'2300kb'});
  router.use((req,res,next)=>{const route=creatorRoute(req.originalUrl||req.url,req.method);if(!route.owned)return next();if(!route.allowed)return res.status(405).json({error:'Method not allowed'});return raw(req,res,next)});
  router.use(async(req,res,next)=>{
   // Leave unrelated versioned read APIs to their existing handlers.
   const path=(req.originalUrl||req.url).split('?')[0];
   if(!creatorRoute(path,req.method).owned)return next();
   if(!env.PUBLIC_ORIGIN)return res.status(503).json({error:'Creator backend disabled. Configure exact PUBLIC_ORIGIN; public browsing is unaffected.'});
   if(env.NODE_ENV==='production'&&(env.CREATOR_STORAGE_PERSISTENT!=='1'||!isAbsolute(env.CREATOR_DB||'')))return res.status(503).json({error:'Account storage is not ready. Configure and verify a persistent creator database volume before enabling accounts.'});
   try{
    if(!service)service=createCreatorService({sessionTransport:env.CREATOR_AUTH_TRANSPORT||'cookie',db:localD1(env.CREATOR_DB||'data/creator.sqlite'),origin:env.PUBLIC_ORIGIN,chain:creatorChain(env),uploadProvider:pinataProvider(env.PINATA_JWT),uploadBytes:Number(env.PIN_SPONSORED_BYTES||0),uploadFiles:Number(env.PIN_SPONSORED_FILES||0),logger:(event,e)=>console.error(event,e.name||'Error')});
    const method=req.method,headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v!==undefined)headers.set(k,Array.isArray(v)?v.join(','):v);
    const body=['GET','HEAD'].includes(method)?undefined:(req.body?.length?new Uint8Array(req.body):undefined);
    const request=new Request(new URL(req.originalUrl||req.url,env.PUBLIC_ORIGIN),{method,headers,body});
    const result=await service.handle(request);if(!result)return next();res.statusCode=result.status;result.headers.forEach((v,k)=>res.setHeader(k,v));res.end(Buffer.from(await result.arrayBuffer()));
   }catch(e){console.error('Creator API unavailable:',e.name||'Error');res.status(503).json({error:'Creator service unavailable'})}
  });
  router.use((error,req,res,next)=>{if(error.type==='entity.too.large')return res.status(413).json({error:'Request body too large'});next(error)});
  server.middlewares.use(router);
 }};
}
