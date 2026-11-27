import {loadWorkerChainAccess} from './worker-chain-access.js';
import {setTimeout as delay} from 'node:timers/promises';
import {MarketIndex} from './market-index.js';
const env=process.env;
if(!/^\d+$/.test(env.MARKET_START_BLOCK||''))throw Error('Set actual MARKET_START_BLOCK before starting market worker');
const interval=Number(env.MARKET_SYNC_INTERVAL_MS||15000);
if(!Number.isSafeInteger(interval)||interval<5000)throw Error('Index interval must be at least 5000ms');
const store=new MarketIndex({address:env.MARKETPLACE_ADDRESS||env.VITE_MARKETPLACE_ADDRESS,startBlock:Number(env.MARKET_START_BLOCK),path:env.MARKET_INDEX_DB||'data/market-index.sqlite'});
const access=await loadWorkerChainAccess(),provider=access.provider;let stop=false;
process.on('SIGTERM',()=>{stop=true});process.on('SIGINT',()=>{stop=true});
try{while(!stop){try{console.log(JSON.stringify({event:'market-index-progress',...await store.sync(provider,{...(access.mode==='single-provider'?{span:Number(env.MARKET_BLOCK_SPAN||1000)}:{...access.options,replay:8})})}))}catch(e){console.error(JSON.stringify({event:'market-index-error',error:e.shortMessage||e.message,note:'Checkpoint was not advanced. Reorg errors require operator rebuild.'}))}if(!stop)await delay(interval)}}finally{access.close();store.close()}
