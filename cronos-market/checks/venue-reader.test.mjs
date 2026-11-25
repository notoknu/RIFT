import test from 'node:test';import assert from 'node:assert/strict';import express from 'express';
import {createVenueReader,venueSnapshotPlugin,fetchVenueSnapshot} from '../server/venue-snapshot.js';
import {normalizeVenueSnapshot,validateNormalizedVenueSnapshot} from '../shared/venue-snapshot.js';
const address='0x'+'a'.repeat(40),other='0x'+'b'.repeat(40),third='0x'+'c'.repeat(40),snapshot=a=>normalizeVenueSnapshot({chain:25,address:a,volumeCro7d:0},a);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('same collection shares one in-flight read with canonical keys and detached results',async()=>{
 let release,calls=0;const reader=createVenueReader({read:a=>{calls++;return new Promise(resolve=>release=()=>resolve(snapshot(a)));}});const a=reader.get(address),b=reader.get('0x'+address.slice(2).toUpperCase());await tick();assert.equal(calls,1);release();const values=await Promise.all([a,b]);values[0].volume7dCRO='999';assert.equal(values[1].volume7dCRO,'0');assert.equal((await reader.get(address)).volume7dCRO,'0');assert.equal(reader.diagnostics().active,0);
});
test('different collections respect the global per-reader concurrency cap without starting extra work',async()=>{
 const releases=[];let calls=0;const reader=createVenueReader({maxActive:2,read:a=>{calls++;return new Promise(resolve=>releases.push(()=>resolve(snapshot(a))));}});const a=reader.get(address),b=reader.get(other);await tick();await assert.rejects(reader.get(third),e=>e.code==='busy');assert.equal(calls,2);assert.equal(reader.diagnostics().active,2);releases.forEach(release=>release());await Promise.all([a,b]);await reader.get(address);assert.equal(calls,2);
});
test('sync provider throws are cooled down with bounded exponential jitter and explicit recovery',async()=>{
 let time=0,calls=0,down=true;const reader=createVenueReader({read:a=>{calls++;if(down)throw Error('private-source-marker');return snapshot(a);},now:()=>time,random:()=>1});
 for(const delay of [6000,12000,24000,48000,72000,72000]){await assert.rejects(reader.get(address),e=>e.retryAfterMs===delay&&!e.message.includes('private-source'));const before=calls;await assert.rejects(reader.get(address));assert.equal(calls,before);time+=delay;}
 down=false;assert.equal((await reader.get(address)).stale,false);assert.equal(reader.diagnostics().active,0);assert.ok(!JSON.stringify(reader.diagnostics()).includes(address));
});
test('old data is marked stale during cooldown and cannot outlive retention',async()=>{
 let time=0,down=false,calls=0;const reader=createVenueReader({read:a=>{calls++;if(down)throw Error('down');return snapshot(a);},now:()=>time,random:()=>0,ttlMs:100,staleMs:1000});await reader.get(address);time=101;down=true;const stale=await reader.get(address);assert.equal(stale.stale,true);assert.equal(stale.volume7dCRO,'0');assert.equal(stale.staleAgeMs,101);await reader.get(address);assert.equal(calls,2);time=1001;await assert.rejects(reader.get(address));assert.equal(calls,2);
});
test('positive cache bytes and negative record count stay within configured bounds',async()=>{
 const size=Buffer.byteLength(JSON.stringify(snapshot(address)));const reader=createVenueReader({read:async a=>snapshot(a),maxEntries:2,maxBytes:size+20});await reader.get(address);await reader.get(other);assert.equal(reader.diagnostics().records,1);assert.ok(reader.diagnostics().bytes<=size+20);
 const negative=createVenueReader({maxEntries:2,read:()=>{throw Error('down');}});for(const a of [address,other,third])await assert.rejects(negative.get(a));assert.equal(negative.diagnostics().records,2);assert.equal(negative.diagnostics().bytes,0);
});
test('in-flight records cannot be evicted to bypass capacity or start duplicate reads',async()=>{
 let release,calls=0;const reader=createVenueReader({maxEntries:1,read:a=>{calls++;return new Promise(resolve=>release=()=>resolve(snapshot(a)));}});const pending=reader.get(address);await tick();await assert.rejects(reader.get(other),e=>e.code==='busy');const joined=reader.get(address);assert.equal(calls,1);release();await Promise.all([pending,joined]);
});
test('invalid binding or oversized refresh never replaces a previous valid observation',async()=>{
 let time=0,bad=false;const reader=createVenueReader({now:()=>time,ttlMs:10,random:()=>0,read:a=>bad?{...snapshot(other),extra:'x'.repeat(9000)}:snapshot(a)});await reader.get(address);time=11;bad=true;const value=await reader.get(address);assert.equal(value.address,address);assert.equal(value.stale,true);assert.equal(value.extra,undefined);
 const oversized=createVenueReader({read:a=>({...snapshot(a),extra:'x'.repeat(9000)})});await assert.rejects(oversized.get(address));assert.equal(oversized.diagnostics().bytes,0);
});
test('normalization keeps unsafe or unsupported numbers unknown and validator enforces identity',()=>{
 const value=normalizeVenueSnapshot({chain:25,address,volumeCro7d:1e40,owners:Number.MAX_SAFE_INTEGER+1,floor:String(2n**256n)},address);assert.equal(value.volume7dCRO,null);assert.equal(value.owners,null);assert.equal(value.floorCRO,null);assert.equal(validateNormalizedVenueSnapshot(value,address),value);for(const patch of [{address:other},{chainId:1},{volume7dCRO:0},{activeListings:'1.5'},{sourceUrl:'https://evil.example'},{stale:true}])assert.throws(()=>validateNormalizedVenueSnapshot({...value,...patch},address));
});
test('venue transport omits credentials and rejects HTTP/oversized/foreign-chain responses',async()=>{
 const calls=[];const value=await fetchVenueSnapshot(address,{fetcher:async(url,options)=>{calls.push(options);return Response.json({chain:25,rows:[{chain:25,address}]});}});assert.equal(value.address,address);assert.equal(calls[0].credentials,'omit');assert.equal(calls[0].redirect,'error');for(const response of [()=>new Response('',{status:429}),()=>new Response('x'.repeat(1048577)),()=>Response.json({chain:1,rows:[]})])await assert.rejects(fetchVenueSnapshot(address,{fetcher:async()=>response()}));
});
test('HTTP failures return bounded retry hints and subsequent calls do not repeat upstream reads',async()=>{
 let calls=0;const app=express();venueSnapshotPlugin({random:()=>0,read:()=>{calls++;throw Error('private-url-marker');}}).configureServer({middlewares:app});const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));try{const url='http://127.0.0.1:'+server.address().port+'/api/v1/collection-market?address='+address;const first=await fetch(url);assert.equal(first.status,503);assert.equal(first.headers.get('retry-after'),'5');assert.ok(!(await first.text()).includes('private-url'));assert.equal((await fetch(url)).status,503);assert.equal(calls,1);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('invalid addresses and cache configurations fail before any provider work',async()=>{let calls=0;const reader=createVenueReader({read:()=>{calls++;return snapshot(address);}});await assert.rejects(reader.get('bad'));await assert.rejects(fetchVenueSnapshot('bad',{fetcher:async()=>{calls++;}}));assert.equal(calls,0);for(const options of [{maxEntries:0},{maxEntries:1001},{maxBytes:1},{maxActive:4},{ttlMs:0},{staleMs:1}])assert.throws(()=>createVenueReader(options));});
