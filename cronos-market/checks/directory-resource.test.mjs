import test from 'node:test';import assert from 'node:assert/strict';import express from 'express';import {createDirectoryResource,rankingsPlugin} from '../server/rankings.js';import {validateDirectorySnapshot} from '../shared/directory-snapshot.js';import {buildDirectory} from '../shared/rankings-core.js';
const directory=()=>({...buildDirectory([{address:'0x'+'1'.repeat(40),name:'Controlled original',description:'Gaming original',chain:{name:'CRONOS'},volume:{volumeAllNative:'10',volume7dNative:'1'}}]),updatedAt:new Date(1000).toISOString(),stale:false});
test('saved normalized directory validates chain, exact rank counts, amounts and uniqueness',()=>{
 const good=directory();assert.equal(validateDirectorySnapshot(good),good);
 for(const mutate of [v=>v.chainId=1,v=>v.collections.push({...v.collections[0]}),v=>v.counts.allTime=2,v=>v.collections[0].allTimeRank=2,v=>v.collections[0].volumeTotal='0.0',v=>v.collections[0].volume7d=1,v=>v.updatedAt='bad',v=>v.collections[0].description={},v=>v.collections[0].image='https://user:pass@example.com/a',v=>v.collections[0].category={},v=>v.collections[0].owners=-1]){const bad=structuredClone(good);mutate(bad);assert.throws(()=>validateDirectorySnapshot(bad));}
});
test('directory resource never exposes a corrupted saved file as stale data',async()=>{
 const resource=createDirectoryResource({load:()=>{throw Error('provider-down');},snapshot:{read:async()=>({...directory(),chainId:1}),save:async()=>{}},now:()=>2000});await assert.rejects(resource.get());assert.equal(resource.diagnostics().hasUsableSnapshot,false);
});
test('valid saved directory is marked stale during cooldown and refresh saves only good data',async()=>{
 let time=2000,down=true,calls=0,saves=0;const resource=createDirectoryResource({load:async()=>{calls++;if(down)throw Error('down');return directory();},snapshot:{read:async()=>directory(),save:async()=>{saves++;}},now:()=>time,random:()=>0});assert.equal((await resource.get()).stale,true);await resource.get();assert.equal(calls,1);assert.equal(saves,0);time+=5000;down=false;assert.equal((await resource.get()).stale,false);assert.equal(saves,1);
});
test('rankings route returns a bounded retry hint without leaking upstream error details',async()=>{
 const app=express();rankingsPlugin({read:async()=>{throw Object.assign(Error('private-url-marker'),{retryAfterMs:5001});}}).configureServer({middlewares:app});const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));try{const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/collections');assert.equal(response.status,503);assert.equal(response.headers.get('retry-after'),'6');assert.ok(!(await response.text()).includes('private-url'));}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
