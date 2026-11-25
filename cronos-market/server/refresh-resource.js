// One bounded provider resource. No timers, automatic retries, wallet calls or global quota claims.
export function createRefreshResource({load,validate=()=>{},readSaved,save,now=Date.now,random=Math.random,ttlMs=300000,staleMs=604800000,maxBytes=2097152}={}){
 if(typeof load!=='function'||typeof validate!=='function'||typeof now!=='function'||typeof random!=='function'||!Number.isSafeInteger(ttlMs)||ttlMs<1||!Number.isSafeInteger(staleMs)||staleMs<ttlMs||!Number.isSafeInteger(maxBytes)||maxBytes<128||maxBytes>4194304)throw Error('Invalid refresh resource configuration');
 let json=null,observedAt=null,freshUntil=0,retryAfter=0,failures=0,pending=null,savedChecked=false,persistence='not-attempted';
 const encode=value=>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Object resource required');validate(value);const text=JSON.stringify(value);if(typeof text!=='string'||Buffer.byteLength(text)>maxBytes)throw Error('Invalid bounded resource result');return text;};
 const usable=()=>json!==null&&observedAt!==null&&now()>=observedAt&&now()-observedAt<=staleMs;
 const result=stale=>{const value=JSON.parse(json);return stale?{...value,stale:true,warning:'Live refresh unavailable; last successful snapshot',staleAgeMs:Math.max(0,now()-observedAt),retryAfterMs:Math.max(0,retryAfter-now())}:value;};
 function unavailable(){const error=Error('Provider resource unavailable or cooling down');error.retryAfterMs=Math.max(0,retryAfter-now());throw error;}
 return {
  diagnostics(){return {pending:!!pending,hasUsableSnapshot:usable(),fresh:usable()&&now()<freshUntil,retryAfterMs:Math.max(0,retryAfter-now()),consecutiveFailures:failures,persistence};},
  async get(){
   if(usable()&&now()<freshUntil)return result(false);
   if(pending)return pending.then(value=>structuredClone(value));
   if(now()<retryAfter){if(usable())return result(true);return unavailable();}
   pending=Promise.resolve().then(async()=>{
    if(!savedChecked){savedChecked=true;if(readSaved)try{const saved=await readSaved();if(saved){const time=Date.parse(saved.updatedAt);if(!Number.isFinite(time)||time>now()||now()-time>staleMs)throw Error('Saved observation outside retention');const encoded=encode(saved);json=encoded;observedAt=time;}}catch{persistence='saved-snapshot-rejected';}}
    try{
     const value=await load(),encoded=encode(value);json=encoded;observedAt=now();freshUntil=observedAt+ttlMs;retryAfter=0;failures=0;
     if(save)try{await save(JSON.parse(encoded));persistence='saved';}catch{persistence='save-failed';}
     return result(false);
    }catch{
     failures=Math.min(failures+1,5);const base=Math.min(5000*2**(failures-1),60000),sample=Number(random());const jitter=Number.isFinite(sample)?Math.floor(Math.min(1,Math.max(0,sample))*base*.2):0;retryAfter=now()+base+jitter;freshUntil=0;
     if(usable())return result(true);return unavailable();
    }
   }).finally(()=>{pending=null;});
   return pending.then(value=>structuredClone(value));
  },
 };
}
