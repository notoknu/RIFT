import test from 'node:test';import assert from 'node:assert/strict';import {generateArt,validateRecipe,STARTER_RECIPE} from '../shared/generative-art.js';
const copy=()=>JSON.parse(JSON.stringify(STARTER_RECIPE));
test('layer generator is deterministic, unique across complete trait space and returns matching hashes',()=>{
 const r=copy(),count=Number(validateRecipe(r).combinations),items=generateArt(r,count);assert.equal(count,54);assert.deepEqual(items,generateArt(r,count));assert.equal(new Set(items.map(i=>JSON.stringify(i.attributes))).size,count);assert.equal(new Set(items.map(i=>i.contentHash)).size,count);assert.ok(items.every(i=>i.svg.startsWith('<svg')&&i.attributes.length===4));r.seed='another original seed';assert.notDeepEqual(generateArt(r,10),items.slice(0,10));
});
test('generator rejects invalid supply, external references, executable markup and unbounded shapes',()=>{
 assert.throws(()=>generateArt(copy(),55),/Supply/);assert.throws(()=>generateArt(copy(),0),/Supply/);for(const change of [r=>r.layers[0].variants[0].shapes[0].onclick='alert(1)',r=>r.layers[0].variants[0].shapes[0].fill='url(https://evil.test)',r=>r.layers[0].variants[0].shapes[0].width=Infinity,r=>r.layers[0].variants[0].shapes[0].type='script',r=>r.layers[1].name=r.layers[0].name]){const r=copy();change(r);assert.throws(()=>validateRecipe(r))}
});
test('bijective generator handles the single-combination boundary and large spaces without retry loops',()=>{
 const r=copy();for(const layer of r.layers)layer.variants=layer.variants.slice(0,1);assert.equal(generateArt(r,1).length,1);assert.throws(()=>generateArt(r,2));r.layers=Array.from({length:8},(_,i)=>({name:'Layer '+i,variants:Array.from({length:16},(_,j)=>({name:'Variant '+j,shapes:[]}))}));assert.equal(new Set(generateArt(r,2000).map(i=>JSON.stringify(i.attributes))).size,2000);
});
