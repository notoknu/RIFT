import {scanPlatformExchange} from './platform-exchange-scan.js';
import {publishPlatformRange,reconcilePlatformRange} from './platform-exchange-recovery.js';
import {PlatformRpcError} from './platform-exchange-rpc.js';
export class LifecycleError extends Error{constructor(code,intentId){super(code);this.name='LifecycleError';this.code=code;if(intentId)this.intentId=intentId;}}
function cancellation(signal){if(signal?.aborted)throw new PlatformRpcError('RPC_CANCELLED')}
/** Opt-in bounded lifecycle operation; caller owns independent store/journal/lease resources. */
export async function runJournaledExchangeScan({journal,openFresh,...options}){
 if(!journal||typeof openFresh!=='function'||journal.client===options.store?.client)throw new LifecycleError('INDEPENDENT_JOURNAL_AND_FRESH_FACTORY_REQUIRED');
 await journal.assertSchema();await options.store.assertSchema();
 if((await journal.pending(options.binding)).length)throw new LifecycleError('RECOVERY_INTENT_PENDING');
 let intentId;
 try{return await scanPlatformExchange({...options,publishRange:async(binding,request,{signal})=>{
  cancellation(signal);
  const intent=await journal.prepare(binding,request);intentId=intent.id;
  cancellation(signal);await journal.transition(intent.id,'prepared','attempting');cancellation(signal);
  let result;
  try{result=await publishPlatformRange({store:options.store,binding,request,openFresh})}
  catch(error){try{await journal.transition(intent.id,'attempting','held','semantic-failure')}catch{}throw error;}
  if(result.outcome==='committed'){await journal.transition(intent.id,'attempting','acknowledged','committed');return result.state;}
  await journal.transition(intent.id,'attempting','held',result.outcome);
  throw new LifecycleError('RECOVERY_REVIEW_REQUIRED',intent.id);
 }});}catch(error){
  if(error.code==='PUBLICATION_HANDLER_STOPPED'){const wrapped=new LifecycleError('JOURNALED_PUBLICATION_STOPPED',intentId);wrapped.reasonCode=error.publicationCode||'PUBLICATION_FAILED';throw wrapped;}
  throw error;
 }
}
/** Restart observation only. Never replays, resolves, deletes or releases an outstanding intent. */
export async function observePendingExchangeIntents({journal,binding,openFresh}){
 if(typeof openFresh!=='function')throw new LifecycleError('FRESH_STORE_FACTORY_REQUIRED');
 await journal.assertSchema();const pending=await journal.pending(binding),results=[];
 for(const item of pending){const intent=await journal.read(item.id);const result=await reconcilePlatformRange({binding:intent.binding,request:intent.request,openFresh});
  if(intent.phase==='attempting'||intent.phase==='held')await journal.transition(intent.id,intent.phase,'held',result.outcome);
  results.push({id:intent.id,phase:intent.phase==='prepared'?'prepared':'held',outcome:result.outcome,retryAllowed:false,requiresReview:true});
 }
 return {items:results,automaticReplay:false};
}
