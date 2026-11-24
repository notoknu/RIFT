import {isAddress} from 'ethers';import {ExchangeIndex} from './exchange-index.js';
export function exchangeAPIPlugin({env=process.env}={}){let store;return {name:'rift-v2-exchange',configureServer(server){
 server.middlewares.use('/api/v1/exchange',(req,res)=>{
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  const send=(status,value)=>{res.statusCode=status;res.end(JSON.stringify(value))};if(req.method!=='GET')return send(405,{error:'GET required'});
  const configured=isAddress(env.EXCHANGE_ADDRESS||'')&&/^\d+$/.test(env.EXCHANGE_START_BLOCK||'')&&/^0x[\da-f]{64}$/i.test(env.EXCHANGE_RUNTIME_HASH||'');
  const url=new URL(req.url,'http://internal');
  if(url.pathname==='/capabilities')return send(200,{chainId:25,configured,tradingEnabled:configured&&env.EXCHANGE_TRADING_ENABLED==='1',address:configured?env.EXCHANGE_ADDRESS:null,runtimeHash:configured?env.EXCHANGE_RUNTIME_HASH:null,review:'Unaudited software. Enabling requires explicit operator release approval. Zero platform fee; wallet pays gas.'});
  if(!['/listings','/offers','/activity'].includes(url.pathname))return send(404,{error:'Unknown exchange route'});
  if(!configured)return send(503,{error:'V2 exchange is not deployed/configured'});
  try{store||=new ExchangeIndex({path:env.EXCHANGE_INDEX_DB||'data/exchange.sqlite',address:env.EXCHANGE_ADDRESS,startBlock:Number(env.EXCHANGE_START_BLOCK)});
   if(url.pathname==='/activity')return send(200,store.activity({nft:url.searchParams.get('nft'),cursor:url.searchParams.get('cursor'),limit:Number(url.searchParams.get('limit')||24)}));
   return send(200,store.page({type:url.pathname==='/offers'?'offer':'listing',cursor:url.searchParams.get('cursor'),limit:Number(url.searchParams.get('limit')||24),nft:url.searchParams.get('nft')||undefined,account:url.searchParams.get('account')||undefined,includeClosed:url.searchParams.get('closed')==='1'}));
  }catch(e){return send(/Invalid|integer|range/i.test(e.message)?400:503,{error:'Exchange query unavailable or invalid'})}
 });
}}}
