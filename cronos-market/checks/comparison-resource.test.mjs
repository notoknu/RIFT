import test from 'node:test';import assert from 'node:assert/strict';import express from 'express';
import {buildComparison,validateComparison,fetchComparison,createComparisonResource,crosscheckPlugin} from '../server/crosscheck.js';
const address='0x'+'1'.repeat(40),row={chain:25,address,name:'Original fixture',volumeCroAll:10,volumeCro7d:2,floor:'0'};
const minted={chainId:25,updatedAt:new Date(1000).toISOString(),stale:false,collections:[{address,name:'Minted fixture',image:null,floor:'1.0',volumeTotal:'3.0',volume7d:null}]};
const build=(patch={})=>buildComparison({all:[row],week:[row],minted,now:()=>new Date(1000).toISOString(),...patch});
test('venue and Minted totals stay independent and missing values/zero floor survive',()=>{const value=build();assert.equal(value.collections[0].volumeTotal,'10');assert.equal(value.collections[0].minted.volumeTotal,'3.0');assert.equal(value.collections[0].minted.volume7d,null);assert.equal(value.collections[0].floor,'0.0');assert.equal(value.matched,1);assert.match(value.scope,/not added/);});
test('invalid rows, overlarge periods, duplicates and conflicting observations fail closed',()=>{
 for(const patch of [{all:Array.from({length:101},()=>row)},{all:[{...row,chain:1}]},{all:[row,row]},{week:[{...row,volumeCroAll:11}]},{all:[{...row,volumeCroAll:-1}]},{all:[{...row,floor:String(2n**256n)}]},{all:[{...row,floorSpark7d:[NaN]}]}])assert.throws(()=>build(patch));
});
test('saved comparison binding, counts, ranks and links are validated',()=>{
 for(const mutate of [v=>v.matched=99,v=>v.collections.push(v.collections[0]),v=>v.collections[0].image='/unsafe',v=>v.collections[0].imageSource='javascript:bad',v=>v.collections[0].weeklyRank=101,v=>v.collections[0].url='https://evil.example',v=>v.crovia.url='https://evil.example',v=>v.collections[0].minted.image='http://example.com/a']){const value=build();mutate(value);assert.throws(()=>validateComparison(value));}
});
test('bounded HTTP acquisition preserves safe transport options and never writes snapshots itself',async()=>{
 const calls=[];const value=await fetchComparison({readDirectory:async()=>minted,now:()=>new Date(1000).toISOString(),fetcher:async(url,options)=>{calls.push({url,options});return Response.json({chain:25,rows:[row]});}});assert.equal(calls.length,2);assert.equal(value.collections.length,1);for(const call of calls){assert.equal(call.options.redirect,'error');assert.equal(call.options.credentials,'omit');}
 for(const response of [()=>new Response('',{status:429}),()=>Response.json({chain:1,rows:[]}),()=>new Response('x'.repeat(2097153))])await assert.rejects(fetchComparison({readDirectory:async()=>minted,fetcher:async()=>response()}));
});
test('comparison resource shares refreshes, serves marked stale data during cooldown and recovers',async()=>{
 let time=1000,calls=0,down=false,saves=0;const resource=createComparisonResource({load:async()=>{calls++;if(down)throw Error('down');return build();},snapshot:{read:async()=>null,save:async()=>saves++},now:()=>time,ttlMs:100,random:()=>0});const values=await Promise.all([resource.get(),resource.get()]);assert.equal(calls,1);values[0].collections[0].name='changed';assert.equal(values[1].collections[0].name,'Original fixture');time+=101;down=true;assert.equal((await resource.get()).stale,true);await resource.get();assert.equal(calls,2);time+=5000;down=false;assert.equal((await resource.get()).stale,false);assert.equal(saves,2);
});
test('invalid saved comparisons cannot become fallback data',async()=>{const resource=createComparisonResource({load:async()=>{throw Error('down');},snapshot:{read:async()=>({...build(),matched:99}),save:async()=>{}},now:()=>2000});await assert.rejects(resource.get());assert.equal(resource.diagnostics().hasUsableSnapshot,false);});
test('comparison route exposes retry hints but not upstream error contents',async()=>{
 const app=express();crosscheckPlugin({read:async()=>{throw Object.assign(Error('private-url'),{retryAfterMs:5001});}}).configureServer({middlewares:app});const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));try{const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/crosscheck');assert.equal(response.status,503);assert.equal(response.headers.get('retry-after'),'6');assert.ok(!(await response.text()).includes('private-url'));}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('missing history samples remain gaps rather than zeroes or fabricated continuity',()=>{const value=build({all:[{...row,floorSpark7d:[1,null,2]}],week:[row]});assert.deepEqual(value.collections[0].floorHistory7d,[1,null,2]);assert.equal(validateComparison(value),value);});

test('nullable provider labels and unsafe artwork become unknown without fabricated metadata',()=>{const value=build({all:[{...row,name:null,image:'http://example.com/a'}],week:[row]});assert.equal(value.collections[0].name,address);assert.equal(value.collections[0].imageSource,null);});
