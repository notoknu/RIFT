import {MarketIndex} from './market-index.js';
let instance;
function index(){
 if(instance)return instance;
 const env=process.env;
 const address=env.MARKETPLACE_ADDRESS||env.VITE_MARKETPLACE_ADDRESS;
 const block=env.MARKET_START_BLOCK;
 if(!address||!/^\d+$/.test(block||''))return null;
 instance=new MarketIndex({address,startBlock:Number(block),path:env.MARKET_INDEX_DB||'data/market-index.sqlite'});return instance;
}
export function marketAPIPlugin(){return {name:'rift-market-index-api',configureServer(server){
 server.middlewares.use('/api/v1/listings',(req,res)=>{
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.statusCode=405;return res.end(JSON.stringify({error:'GET required'}))}
  try{const db=index();if(!db){res.statusCode=503;return res.end(JSON.stringify({error:'Marketplace index not configured. Set the deployed address and MARKET_START_BLOCK, then run market:sync.'}))}
   const u=new URL(req.url,'http://internal');if(u.pathname!=='/'&&u.pathname!==''){res.statusCode=404;return res.end(JSON.stringify({error:'Unknown listing route'}))}const limit=u.searchParams.has('limit')?Number(u.searchParams.get('limit')):24;
   const result=db.page({cursor:u.searchParams.get('cursor')??undefined,seller:u.searchParams.get('seller')||undefined,limit});res.end(JSON.stringify(result));
  }catch(e){res.statusCode=/cursor|Limit|seller/.test(e.message)?400:503;res.end(JSON.stringify({error:e.message}))}
 });
}}}
