// Opt-in acquisition adapter. No signing, broadcasting, automatic cutover or live defaults.
export class ChainReadError extends Error { constructor(code){super(code);this.code=code;} }
const fail=code=>{throw new ChainReadError(code)};
const hash=v=>typeof v==='string'&&/^0x[0-9a-f]{64}$/i.test(v);
const height=v=>Number.isSafeInteger(v)&&v>=0;
export function createChainReadQuorum({providers,chainId=25,quorum=2,timeoutMs=5000,maxHeadLag=24}={}){
 if(!Array.isArray(providers)||providers.length<2||providers.length>5||!Number.isSafeInteger(chainId)||chainId<1||!Number.isInteger(quorum)||quorum<2||quorum>providers.length||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000||!height(maxHeadLag))fail('INVALID_CHAIN_READ_CONFIG');
 const ids=new Set(),domains=new Set();
 for(const p of providers){if(!p||!/^[-a-zA-Z0-9_]{1,64}$/.test(p.id)||!/^[-a-zA-Z0-9_]{1,64}$/.test(p.failureDomain)||ids.has(p.id)||domains.has(p.failureDomain)||!['getNetwork','getBlockNumber','getBlock'].every(k=>typeof p.adapter?.[k]==='function'))fail('INVALID_CHAIN_READ_PROVIDER');ids.add(p.id);domains.add(p.failureDomain)}
 let diagnostics=[];
 async function bounded(fn){let timer;try{return await Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new ChainReadError('RPC_TIMEOUT')),timeoutMs)})])}finally{clearTimeout(timer)}}
 async function read(number,timed){
  if(!height(number))fail('PINNED_BLOCK_REQUIRED');
  const rows=await Promise.all(providers.map(async p=>{try{
   const result=await bounded(async()=>{const network=await p.adapter.getNetwork();if(BigInt(network.chainId)!==BigInt(chainId))fail('WRONG_CHAIN');const head=await p.adapter.getBlockNumber();if(!height(head)||head<number)fail('HEAD_BEHIND_CHECKPOINT');const block=await p.adapter.getBlock(number);if(!block||block.number!==number||!hash(block.hash)||!hash(block.parentHash))fail('INVALID_BLOCK');if(timed&&(!Number.isSafeInteger(block.timestamp)||block.timestamp<=0||block.timestamp>Math.floor(Date.now()/1000)))fail('INVALID_BLOCK_TIMESTAMP');return {head,block:{number,hash:block.hash.toLowerCase(),parentHash:block.parentHash.toLowerCase(),...(timed?{timestamp:block.timestamp}:{})}}});
   return {id:p.id,status:'healthy',...result};
  }catch(e){return {id:p.id,status:e instanceof ChainReadError?e.code:'RPC_UNAVAILABLE'}}}));
  const valid=rows.filter(r=>r.status==='healthy'),highest=Math.max(-1,...valid.map(r=>r.head));
  for(const r of valid)if(highest-r.head>maxHeadLag)r.status='STALE_HEAD';
  const eligible=rows.filter(r=>r.status==='healthy');diagnostics=rows.map(({id,status,head})=>({id,status,...(head===undefined?{}:{head})}));
  // Successful contradictory responses, including stale-head responses, are not silently outvoted.
  const identities=new Set(valid.map(r=>r.block.hash+':'+r.block.parentHash+(timed?':'+r.block.timestamp:'')));
  if(identities.size>1)fail('CHAIN_DISAGREEMENT');if(eligible.length<quorum)fail('CHAIN_QUORUM_UNAVAILABLE');
  return Object.freeze({chainId,block:Object.freeze({...eligible[0].block}),observedHead:Math.min(...eligible.map(r=>r.head)),agreeingProviders:Object.freeze(eligible.map(r=>r.id)),assurance:'provider-agreement-not-proof'});
 }
 return Object.freeze({diagnostics:()=>diagnostics.map(x=>({...x})),readCheckpoint:number=>read(number,false),readTimedCheckpoint:number=>read(number,true)});
}
