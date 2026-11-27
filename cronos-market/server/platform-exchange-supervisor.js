import {runPlatformExchangeSchedule} from './platform-exchange-scheduler.js';
const codeOf=e=>/^[A-Z_]{1,80}$/.test(e?.code||'')?e.code:'SUPERVISOR_FAILED';
export function exchangeJobHealth(snapshot,runtimes){
 const counts={ready:0,running:0,review:0,paused:0,expired:0,unconfigured:0};
 for(const j of snapshot.items){if(!['ready','running','review','paused'].includes(j.phase))throw Object.assign(new Error(),{code:'INVALID_JOB_HEALTH'});counts[j.phase]++;if(j.expired)counts.expired++;if(j.phase==='ready'&&!runtimes.has(j.stream))counts.unconfigured++}
 const reasonCode=counts.review?'JOB_REVIEW_REQUIRED':counts.expired?'EXPIRED_JOB_EXECUTION':counts.unconfigured?'JOB_RUNTIME_NOT_CONFIGURED':null;
 return {status:reasonCode?'blocked':'ready',reasonCode,counts,scope:'Queue readiness only; not chain freshness, hosted durability or consensus certification'};
}
const wait=(ms,signal)=>new Promise(resolve=>{if(signal.aborted)return resolve();const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',done);resolve()},timer=setTimeout(done,ms);signal.addEventListener('abort',done,{once:true})});
/** Bounded foreground supervision. Fresh queue per tick, fail closed on uncertainty. No schema mutation/expiry reclaim. */
export async function runPlatformExchangeSupervisor({openJobs,runtimes,owner,maxTicks=1,maxJobs=4,intervalMs=1000,maxRunMs=300000,signal,onEvent=()=>{}}={}){
 const out={status:'stopped',ticks:0,claimed:0,finished:0,health:null,automaticReplay:false};
 if(typeof openJobs!=='function'||!(runtimes instanceof Map)||typeof onEvent!=='function'||typeof owner!=='string'||!/^[A-Za-z0-9:_-]{1,128}$/.test(owner)||!Number.isInteger(maxTicks)||maxTicks<1||maxTicks>1000||!Number.isInteger(maxJobs)||maxJobs<1||maxJobs>8||!Number.isInteger(intervalMs)||intervalMs<100||intervalMs>60000||!Number.isInteger(maxRunMs)||maxRunMs<1||maxRunMs>3600000){out.reasonCode='INVALID_SUPERVISOR_BOUNDS';return out}
 if(signal?.aborted){out.status='cancelled';return out}
 const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();const timer=setTimeout(abort,maxRunMs);
 const emit=async event=>{try{await onEvent(event)}catch{throw Object.assign(new Error(),{code:'ALERT_SINK_FAILED'})}};
 try{
  for(let i=0;i<maxTicks;i++){
   if(controller.signal.aborted){out.status=signal?.aborted?'cancelled':'time-budget-exhausted';return out}
   let jobs;try{
    jobs=await openJobs();await jobs.assertSchema();const health=exchangeJobHealth(await jobs.inspect(),runtimes);out.health=health;
    if(health.status==='blocked'){out.status='review-required';out.reasonCode=health.reasonCode;await emit({type:'alert',code:health.reasonCode,counts:health.counts});return out}
    const r=await runPlatformExchangeSchedule({jobs,runtimes,owner,maxJobs,signal:controller.signal});out.ticks++;out.claimed+=r.claimed;out.finished+=r.finished;
    out.health=exchangeJobHealth(await jobs.inspect(),runtimes);
    await emit({type:'heartbeat',tick:out.ticks,claimed:r.claimed,finished:r.finished,counts:out.health.counts});
    if(r.reasonCode){out.reasonCode=r.reasonCode;return out}
    if(out.health.status==='blocked'){out.status='review-required';out.reasonCode=out.health.reasonCode;await emit({type:'alert',code:out.health.reasonCode,counts:out.health.counts});return out}
   }finally{if(jobs)try{await jobs.close()}catch{throw Object.assign(new Error(),{code:'QUEUE_CLOSE_FAILED'})}}
   if(controller.signal.aborted){out.status=signal?.aborted?'cancelled':'time-budget-exhausted';return out}
   if(i+1<maxTicks)await wait(intervalMs,controller.signal);
  }
  out.status='tick-budget-exhausted';return out;
 }catch(e){out.reasonCode=codeOf(e);if(out.reasonCode!=='ALERT_SINK_FAILED')try{await emit({type:'alert',code:out.reasonCode})}catch{out.reasonCode='ALERT_SINK_FAILED'}return out}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}
