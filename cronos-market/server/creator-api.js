import {creatorRoute} from '../shared/creator-routes.js';
import {accountStorageConfig} from './account-storage-config.js';
import {remoteD1} from './remote-d1.js';
import express from 'express';
import {localD1} from './local-d1.js';
import {createCreatorService} from '../shared/creator-service.js';
import {pinataProvider} from '../shared/pinata-provider.js';
import {creatorChain} from './creator-chain.js';
export function creatorAPIPlugin({env=process.env}={}){
 let service,initializing;
 return {name:'creator-account-api',configureServer(server){
  const router=express.Router();
  const raw=express.raw({type:()=>true,limit:'2300kb'});
  router.use((req,res,next)=>{const route=creatorRoute(req.originalUrl||req.url,req.method);if(!route.owned)return next();if(!route.allowed)return res.status(405).json({error:'Method not allowed'});return raw(req,res,next)});
  router.use(async(req,res,next)=>{
   // Leave unrelated versioned read APIs to their existing handlers.
   const path=(req.originalUrl||req.url).split('?')[0];
   if(!creatorRoute(path,req.method).owned)return next();
   if(!env.PUBLIC_ORIGIN)return res.status(503).json({error:'Creator backend disabled. Configure exact PUBLIC_ORIGIN; public browsing is unaffected.'});
   if(env.NODE_ENV==='production'&&!accountStorageConfig(env).configured)return res.status(503).json({error:'Account storage is not ready. Configure and verify persistent SQLite storage or remote account storage before enabling accounts.'});
   try{
    if(!service){
     if(!initializing)initializing=(async()=>{
      const driver=env.CREATOR_DB_DRIVER||'sqlite';if(!['sqlite','libsql'].includes(driver))throw Error('Unsupported account storage driver');
      const db=driver==='libsql'?await remoteD1(env):localD1(env.CREATOR_DB||'data/creator.sqlite');
      try{return createCreatorService({sessionTransport:env.CREATOR_AUTH_TRANSPORT||'cookie',db,origin:env.PUBLIC_ORIGIN,chain:creatorChain(env),uploadProvider:pinataProvider(env.PINATA_JWT),uploadBytes:Number(env.PIN_SPONSORED_BYTES||0),uploadFiles:Number(env.PIN_SPONSORED_FILES||0),logger:(event,e)=>console.error(event,e.name||'Error')})}catch(e){db.close();throw e}
     })().catch(e=>{initializing=null;throw e});
     service=await initializing;
    }
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
