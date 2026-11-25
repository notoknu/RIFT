import test from 'node:test';import assert from 'node:assert/strict';
import {buildDirectory} from '../shared/rankings-core.js';
const address=n=>'0x'+BigInt(n).toString(16).padStart(40,'0');
const node=(n,total='1',week='1')=>({address:address(n),name:'Collection '+n,description:'Gaming original',chain:{name:'CRONOS'},volume:{volumeAllNative:total,volume7dNative:week}});
test('disjoint top100 periods yield exactly200 unique collections with independent ranks',()=>{
 const rows=Array.from({length:200},(_,i)=>node(i+1,i<100?String(100-i):'0',i>=100?String(200-i):'0'));
 const result=buildDirectory(rows);assert.equal(result.collections.length,200);assert.deepEqual(result.counts,{allTime:100,weekly:100});assert.equal(result.collections[0].allTimeRank,1);assert.equal(result.collections[0].weeklyRank,null);assert.equal(result.collections[100].weeklyRank,1);assert.equal(result.collections[100].allTimeRank,null);
});
test('overlap deduplicates and ties sort by canonical address independent of input order',()=>{
 const rows=[node(3),node(1),node(2),node(1)];assert.deepEqual(buildDirectory(rows),buildDirectory([...rows].reverse()));const result=buildDirectory(rows);assert.deepEqual(result.collections.map(c=>c.address),[address(1),address(2),address(3)]);assert.equal(result.observations.duplicateRows,1);
});
test('conflicting duplicate exact volume observations fail instead of summing or choosing last',()=>{
 assert.throws(()=>buildDirectory([node(1,'2'),node(1,'3')]),/Conflicting/);assert.throws(()=>buildDirectory([node(1,'2','3'),node(1,'2','4')]),/Conflicting/);
});
test('duplicate metadata selects the same complete row regardless of arrival order',()=>{
 const a=node(1),b={...a,name:'Another name',description:'Artist original'};assert.deepEqual(buildDirectory([a,b]),buildDirectory([b,a]));assert.equal(buildDirectory([a,b]).observations.metadataConflicts,1);assert.deepEqual(buildDirectory([a,b,a]),buildDirectory([a,a,b]));
});
test('ranking uses exact large integers without floating point conversion',()=>{
 const huge=10n**60n;const result=buildDirectory([node(2,String(huge)),node(1,String(huge+1n))]);assert.equal(result.collections[0].address,address(1));assert.notEqual(result.collections[0].volumeTotal,result.collections[1].volumeTotal);
});
test('missing amounts stay unknown and zero weekly volume is not ranked',()=>{
 const row=node(1,'1','0');row.floorPrice={};const other=node(2);delete other.volume.volumeAllNative;const result=buildDirectory([row,other]);assert.equal(result.collections[0].weeklyRank,null);assert.equal(result.collections[0].floor,null);assert.equal(result.collections[1].volumeTotal,null);assert.equal(result.collections[1].allTimeRank,null);
});
test('malformed, negative, unsafe numeric, wrong-chain and oversized data fail closed',()=>{
 for(const value of ['-1','1.2','1e18',1,Number.MAX_SAFE_INTEGER+1,'1'.repeat(79),String(2n**256n)])assert.throws(()=>buildDirectory([node(1,value)]));
 for(const patch of [{chain:{name:'ETHEREUM'}},{address:'bad'},{name:{}},{description:'x'.repeat(6001)},{ownerCount:-1},{assetCount:1.5},{volume:[]},{floorPrice:'bad'}])assert.throws(()=>buildDirectory([{...node(1),...patch}]));
 assert.throws(()=>buildDirectory(Array.from({length:201},(_,i)=>node(i+1))));assert.throws(()=>buildDirectory(null));
});
test('unsafe images are omitted and categories identify inferred versus reviewed source',()=>{
 for(const url of ['http://example.com/a','https://user:pass@example.com/a','javascript:alert(1)','https://example.com/a\nb'])assert.equal(buildDirectory([{...node(1),logo:{url}}]).collections[0].image,null);
 assert.match(buildDirectory([node(1)]).collections[0].categorySource,/inferred/);
 const reviewed=buildDirectory([node(1)],{[address(1)]:{category:'Art & collectibles',source:'Rights-holder review'}}).collections[0];assert.equal(reviewed.category,'Art & collectibles');assert.equal(reviewed.categorySource,'Rights-holder review');assert.throws(()=>buildDirectory([node(1)],{[address(1)]:{category:'Gaming'}}),/source/);
});
