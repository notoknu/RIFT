import test from 'node:test';import assert from 'node:assert/strict';
import {createRefreshResource} from '../server/refresh-resource.js';
const saved=()=>({updatedAt:new Date(1000).toISOString(),stale:false,items:['original']});
test('concurrent refreshes share one load and return detached caller values',async()=>{
 let release,calls=0;const resource=createRefreshResource({load:()=>{calls++;return new Promise(resolve=>release=resolve);},now:()=>1000});const a=resource.get(),b=resource.get();await new Promise(r=>setImmediate(r));assert.equal(calls,1);release(saved());const [first,second]=await Promise.all([a,b]);first.items[0]='changed';assert.equal(second.items[0],'original');assert.equal((await resource.get()).items[0],'original');
});
test('outages use bounded jittered negative caching without scheduled retries',async()=>{
 let time=1000,calls=0;const resource=createRefreshResource({load:()=>{calls++;throw Error('private-url-marker');},now:()=>time,random:()=>1});
 for(const delay of [6000,12000,24000,48000,72000,72000]){await assert.rejects(resource.get(),e=>e.retryAfterMs===delay&&!e.message.includes('private-url'));assert.equal(resource.diagnostics().retryAfterMs,delay);const before=calls;await assert.rejects(resource.get());assert.equal(calls,before);time+=delay;}
 assert.equal(resource.diagnostics().consecutiveFailures,5);assert.ok(!JSON.stringify(resource.diagnostics()).includes('private-url'));
});
test('stale last-good data survives provider failure but expires after retention',async()=>{
 let time=1000,down=false,calls=0;const resource=createRefreshResource({load:()=>{calls++;if(down)throw Error('down');return saved();},ttlMs:100,staleMs:1000,now:()=>time,random:()=>0});await resource.get();down=true;time+=101;const value=await resource.get();assert.equal(value.stale,true);assert.equal(value.retryAfterMs,5000);assert.equal(value.items[0],'original');await resource.get();assert.equal(calls,2);time=2101;await assert.rejects(resource.get());assert.equal(calls,2);
});
test('successful recovery clears cooldown/failure count and restores freshness',async()=>{
 let time=1000,down=true;const resource=createRefreshResource({load:()=>{if(down)throw Error('down');return saved();},now:()=>time,random:()=>0});await assert.rejects(resource.get());time+=5000;down=false;assert.equal((await resource.get()).stale,false);assert.equal(resource.diagnostics().consecutiveFailures,0);assert.equal(resource.diagnostics().retryAfterMs,0);
});
test('saved snapshots are fallback only, must be recent, and are read only once',async()=>{
 let reads=0;const resource=createRefreshResource({load:()=>{throw Error('down');},readSaved:async()=>{reads++;return saved();},now:()=>2000});assert.equal((await resource.get()).stale,true);await resource.get();assert.equal(reads,1);
 for(const updatedAt of ['bad',new Date(3000).toISOString(),new Date(0).toISOString()]){const stale=createRefreshResource({load:()=>{throw Error('down');},readSaved:async()=>({...saved(),updatedAt}),now:()=>2000,ttlMs:10,staleMs:100});await assert.rejects(stale.get());assert.equal(stale.diagnostics().persistence,'saved-snapshot-rejected');}
});
test('persistence failure never marks a valid live result stale or retries its provider',async()=>{
 let calls=0;const resource=createRefreshResource({load:()=>{calls++;return saved();},save:async()=>{throw Error('private-path-marker');},now:()=>1000});assert.equal((await resource.get()).stale,false);assert.equal(resource.diagnostics().persistence,'save-failed');await resource.get();assert.equal(calls,1);assert.ok(!JSON.stringify(resource.diagnostics()).includes('private-path'));
});
test('invalid and oversized refreshes do not replace a prior good snapshot',async()=>{
 let time=1000,value=saved();const resource=createRefreshResource({load:()=>value,validate:v=>{if(!Array.isArray(v.items))throw Error('invalid');},now:()=>time,random:()=>0,ttlMs:10,maxBytes:128});await resource.get();time+=11;value={items:'bad'};assert.deepEqual((await resource.get()).items,['original']);time+=5000;value={items:['x'.repeat(200)]};assert.deepEqual((await resource.get()).items,['original']);
});
test('invalid resource configuration and nonobject results fail closed',async()=>{
 for(const config of [{},{load:()=>{},ttlMs:0},{load:()=>{},staleMs:1},{load:()=>{},maxBytes:0}])assert.throws(()=>createRefreshResource(config));for(const value of [null,1,[],undefined])await assert.rejects(createRefreshResource({load:()=>value}).get());
});
