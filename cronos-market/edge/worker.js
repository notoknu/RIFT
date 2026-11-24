import {creatorCrossOrigin} from '../shared/creator-cors.js';
import {frontendResponse} from './frontend.js';
import {syncEdgeCollection,hydrateEdgeCollection,collectionConfigs} from './collections.js';
import {advanceCatalog} from './catalog.js';
import {publicReadAPI} from './public-reads.js';
import {edgeExchange,syncEdgeExchange} from './exchange.js';
import{verifyFactoryDeployment}from'../shared/verify-factory.js';
import{edgeMetadata}from'./metadata.js';
import{edgeRPC,edgeListings,syncEdgeMarket}from'./market-sync.js';
import {createCreatorService} from '../shared/creator-service.js';
import {pinataProvider} from '../shared/pinata-provider.js';
import {Interface} from 'ethers';
// Creator + RIFT market API slice. Legacy discovery, portfolio and media migration remains separate.
const validSignature=new Interface(['function isValidSignature(bytes32,bytes) view returns(bytes4)']);
async function handle(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/healthz')return Response.json({status:'ok',chainId:25,runtime:'worker',scope:'creator, legacy/v2 D1 exchange, bounded discovery/media/portfolio and deployment-scoped collection reads; hosted acceptance pending'});
  if(!env.DB||!env.PUBLIC_ORIGIN)return Response.json({error:'Creator Worker requires D1 and exact PUBLIC_ORIGIN configuration'},{status:503});
  if(url.pathname.startsWith('/api/v1/exchange/')){try{return await edgeExchange(request,env)}catch{return Response.json({error:'Exchange D1 unavailable or unmigrated'},{status:503})}}
  try{const publicResult=await publicReadAPI(request,env);if(publicResult)return publicResult}catch{return Response.json({error:'Public read service unavailable or unmigrated'},{status:503})}
  // D1 is migrated out of band, never during an untrusted HTTP request.
  if(url.pathname==='/api/v1/listings'&&request.method==='GET'){try{return await edgeListings(env.DB,url,{address:env.MARKETPLACE_ADDRESS,startBlock:env.MARKET_START_BLOCK})}catch{return Response.json({error:'Market database unavailable or unmigrated'},{status:503})}}
  const chain={verify1271:async(wallet,hash,signature)=>{
   const rpc=(method,params)=>edgeRPC(env,method,params);
   if(await rpc('eth_chainId',[])!=='0x19')throw Error('Wrong chain');
   const code=await rpc('eth_getCode',[wallet,'latest']);if(code==='0x')return false;
   try{const result=await rpc('eth_call',[{to:wallet,data:validSignature.encodeFunctionData('isValidSignature',[hash,signature])},'latest']);return validSignature.decodeFunctionResult('isValidSignature',result)[0]==='0x1626ba7e'}catch{return false}
  },register:env.DROP_FACTORY_ADDRESS&&env.DROP_FACTORY_RUNTIME_HASH?async(tx,wallet)=>{const rpc=(method,params)=>edgeRPC(env,method,params);if(await rpc('eth_chainId',[])!=='0x19')throw Error('Wrong chain');return verifyFactoryDeployment({rpc,readMetadata:edgeMetadata,factory:env.DROP_FACTORY_ADDRESS,runtimeHash:env.DROP_FACTORY_RUNTIME_HASH},tx,wallet)}:undefined};
  try{
  const service=createCreatorService({sessionTransport:env.CREATOR_AUTH_TRANSPORT||'cookie',db:env.DB,origin:env.PUBLIC_ORIGIN,chain,uploadProvider:pinataProvider(env.PINATA_JWT),uploadBytes:Number(env.PIN_SPONSORED_BYTES||0),uploadFiles:Number(env.PIN_SPONSORED_FILES||0)});
   // Use one D1 atomic bucket for account mutations; no process-local security state.
   if(request.method!=='GET'){
    // Origin validated before spending DB writes, and IP cannot be supplied in JSON.
    if(request.headers.get('Origin')!==env.PUBLIC_ORIGIN)return Response.json({error:'Same-origin request required'},{status:403});
    const address=request.headers.get('CF-Connecting-IP')||'local',period=Math.floor(Date.now()/60000),key=address+':'+period;
    const used=await env.DB.prepare('INSERT INTO creator_edge_limits(bucket,count,expires) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 WHERE count<20 RETURNING count').bind(key,Date.now()+120000).first();
    if(!used)return Response.json({error:'Creator request limit reached'},{status:429,headers:{'Retry-After':'60'}});
   }
   return await service.handle(request)||Response.json({error:'This endpoint has not been migrated to the creator Worker'},{status:404});
  }catch{return Response.json({error:'Creator Worker unavailable'},{status:503})}
 }
export default {
 async fetch(request,env){const cors=creatorCrossOrigin(request,{origin:env.PUBLIC_ORIGIN,enabled:env.CREATOR_AUTH_TRANSPORT==='bearer'});if(cors.response)return cors.response;let response;try{response=await frontendResponse(request,env)||await handle(request,env)}catch{response=Response.json({error:'Worker unavailable'},{status:503})}const headers=new Headers(response.headers);for(const [key,value]of Object.entries(cors.headers))headers.set(key,value);headers.set('X-Content-Type-Options','nosniff');if(!headers.has('Cache-Control'))headers.set('Cache-Control','no-store');return new Response(response.body,{status:response.status,headers})},
 async scheduled(controller,env){
  // One bounded job per tick: do not stack independent 50-query workloads.
  const jobs=[];if(env.MARKETPLACE_ADDRESS)jobs.push(()=>syncEdgeMarket(env));if(env.EXCHANGE_ADDRESS)jobs.push(()=>syncEdgeExchange(env));if(env.EDGE_CATALOG_ENABLED==='1')jobs.push(()=>advanceCatalog(env));
  const configs=collectionConfigs(env),tick=Math.floor(Date.now()/60000);let config;
  if(configs.length){jobs.push(()=>syncEdgeCollection(env,{config}));jobs.push(()=>hydrateEdgeCollection(env,{config}))}
  if(jobs.length){config=configs[Math.floor(tick/jobs.length)%Math.max(1,configs.length)];try{await jobs[tick%jobs.length]()}catch{console.error('edge-scheduled-step-failed')}}
  await env.DB.prepare('DELETE FROM edge_upstream_budget WHERE period<?').bind((Math.floor(Date.now()/60000)-2)*2).run();
  await env.DB.prepare('DELETE FROM edge_json_cache WHERE key IN (SELECT key FROM edge_json_cache WHERE expires<? LIMIT 50)').bind(Date.now()-604800000).run();
  await env.DB.prepare('DELETE FROM edge_rpc_budget WHERE period<?').bind(Math.floor(Date.now()/60000)-2).run();
  await env.DB.prepare('DELETE FROM creator_edge_limits WHERE bucket IN (SELECT bucket FROM creator_edge_limits WHERE expires<? LIMIT 1000)').bind(Date.now()).run();
 }
};
