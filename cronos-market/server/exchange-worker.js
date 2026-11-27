import {loadWorkerChainAccess} from './worker-chain-access.js';
import {setTimeout as delay} from 'node:timers/promises';import {ExchangeIndex} from './exchange-index.js';
const e=process.env;if(!/^\d+$/.test(e.EXCHANGE_START_BLOCK||''))throw Error('Set real EXCHANGE_START_BLOCK');const store=new ExchangeIndex({path:e.EXCHANGE_INDEX_DB||'data/exchange.sqlite',address:e.EXCHANGE_ADDRESS,startBlock:Number(e.EXCHANGE_START_BLOCK)});
const access=await loadWorkerChainAccess(),provider=access.provider;let stopped=false;for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopped=true});
try{while(!stopped){try{console.log(JSON.stringify({event:'exchange-index-progress',...await store.sync(provider,access.options)}))}catch{console.error(JSON.stringify({event:'exchange-index-failed',note:'Checkpoint unchanged; investigate RPC or recovery window'}))}if(!stopped)await delay(15000)}}finally{access.close();store.close()}
