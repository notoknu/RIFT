import {loadEnv} from 'vite';
import {JsonRpcProvider} from 'ethers';
import {MarketIndex} from '../server/market-index.js';
const env={...loadEnv('production',process.cwd(),''),...process.env};
if(!/^\d+$/.test(env.MARKET_START_BLOCK||''))throw Error('Set MARKET_START_BLOCK to the actual market deployment receipt block');
const store=new MarketIndex({address:env.MARKETPLACE_ADDRESS||env.VITE_MARKETPLACE_ADDRESS,startBlock:Number(env.MARKET_START_BLOCK),path:env.MARKET_INDEX_DB||'data/market-index.sqlite'});
const provider=new JsonRpcProvider(env.CRONOS_RPC_URL||'https://evm.cronos.org',25);
try{console.log(JSON.stringify(await store.sync(provider,{span:Number(env.MARKET_BLOCK_SPAN||1000)}),null,2))}finally{provider.destroy();store.close()}
