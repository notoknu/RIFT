import {createClient} from '@libsql/client';
import {fixture,binding,provider,hash,listed} from './platform-exchange-fixture.mjs';
import {PlatformRecoveryJournal} from '../../server/platform-exchange-journal.js';
import {PlatformReceiptStages} from '../../server/platform-exchange-stage.js';
import {PlatformExchangeJobs} from '../../server/platform-exchange-jobs.js';
export {binding,hash,listed};
export function denseProvider(count=300){const p=provider(),get=p.getBlock.bind(p);p.transactions=Array.from({length:count},(_,i)=>hash(10000+i));p.getBlock=async n=>({...await get(n),transactions:n===10?p.transactions:[]});p.getTransactionReceipt=async tx=>{p.calls.push('receipt');const index=p.transactions.indexOf(tx);return {hash:tx,blockNumber:10,blockHash:hash(10),index,status:1,logs:index===0?[{...listed(),transactionHash:tx,transactionIndex:0}]:[]}};return p}
export async function workerFixture(fn){await fixture(async a=>{await a.store.release(binding,a.lease);const resources=[];function open(Type){const v=new Type(createClient({url:a.url}));resources.push(v);return v}const openJournal=()=>open(PlatformRecoveryJournal),openStages=()=>open(PlatformReceiptStages),openJobs=()=>open(PlatformExchangeJobs);try{const journal=openJournal(),stages=openStages(),jobs=openJobs();for(const r of [journal,stages,jobs])await r.initialize();const p=denseProvider(),options={openStore:a.open,openJournal,openStages,binding,provider:p,owner:'dispatch'};await fn({...a,journal,stages,jobs,openJournal,openStages,openJobs,p,options})}finally{for(const r of resources)await r.close()}})}
