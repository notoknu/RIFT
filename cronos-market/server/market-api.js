import {openConfiguredProjectionReadRepository} from './projection-read-repository.js';
import {openLegacyMarketIndexReadBridge} from './sqlite-projection-read-repository.js';
import {createProjectionRepositorySlot,projectionReadHttpStatus} from '../shared/projection-read-contract.js';
/** Public read contract; the default adapter never initializes target schemas. */
export function marketAPIPlugin({env=process.env,createIndex,createRepository}={}){
 const options=()=>({address:env.MARKETPLACE_ADDRESS||env.VITE_MARKETPLACE_ADDRESS,startBlock:Number(env.MARKET_START_BLOCK),path:env.MARKET_INDEX_DB||'data/market-index.sqlite'});
 const slot=createProjectionRepositorySlot({kind:'legacy-market',open:()=>{const config=options();if(createRepository)return createRepository(config);if(createIndex)return openLegacyMarketIndexReadBridge({createIndex,options:config});return openConfiguredProjectionReadRepository({env,kind:'legacy-market',path:config.path,binding:config})}});
 return {name:'rift-market-index-api',close:()=>slot.close(),configureServer(server){
  server.middlewares.use('/api/v1/listings',async(req,res)=>{
   res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');const send=(status,value)=>{res.statusCode=status;res.end(JSON.stringify(value))};if(req.method!=='GET')return send(405,{error:'GET required'});
   const address=env.MARKETPLACE_ADDRESS||env.VITE_MARKETPLACE_ADDRESS;if(!address||!/^\d+$/.test(env.MARKET_START_BLOCK||''))return send(503,{error:'Marketplace index not configured. Set the deployed address and MARKET_START_BLOCK, then run market:sync.'});
   const u=new URL(req.url,'http://internal'),detail=u.pathname.match(/^\/(\d{1,78})$/);if(!detail&&u.pathname!=='/'&&u.pathname!=='')return send(404,{error:'Unknown listing route'});
   try{const result=await slot.use(repository=>detail?repository.get(detail[1]):repository.page({cursor:u.searchParams.get('cursor')??undefined,seller:u.searchParams.get('seller')||undefined,nft:u.searchParams.get('nft')||undefined,limit:u.searchParams.has('limit')?Number(u.searchParams.get('limit')):24}));return send(detail&&!result.item?404:200,result)}
   catch(e){const status=projectionReadHttpStatus(e);if(status===503)res.setHeader('Retry-After','1');return send(status,{error:'Marketplace query unavailable or invalid'})}
  });
 }};
}
