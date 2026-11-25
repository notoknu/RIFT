import test from 'node:test';import assert from 'node:assert/strict';
import {collectRankingPages} from '../shared/ranking-pages.js';
const page=(edges=[],hasNextPage=false,endCursor=null)=>({data:{collections:{edges:edges.map(node=>({node})),pageInfo:{hasNextPage,endCursor}}}});
test('two periods acquire at most two pages/50 rows with explicit acquisition limits',async()=>{
 const calls=[];const result=await collectRankingPages(async payload=>{calls.push(payload);return page(Array.from({length:50},()=>({address:'fixture'})),true,payload.variables.after?'next2':'next1');});
 assert.equal(calls.length,4);assert.equal(result.nodes.length,200);assert.equal(result.acquisition.atomicSnapshot,false);assert.equal(result.acquisition.periods.every(p=>p.pages===2&&p.rows===100&&p.moreSourceRows),true);assert.deepEqual(calls.map(c=>c.variables.after),[null,'next1',null,'next1']);
});
test('exhausted periods stop independently without inventing a full100',async()=>{
 const result=await collectRankingPages(async()=>page([{}]));assert.deepEqual(result.acquisition.periods.map(p=>p.rows),[1,1]);assert.equal(result.nodes.length,2);
});
test('provider errors including partial data reject the entire acquisition',async()=>{
 for(const errors of [[{message:'partial'}],{},'error'])await assert.rejects(collectRankingPages(async()=>({...page([{}]),errors})),/Invalid/);
 const result=await collectRankingPages(async()=>({...page(),errors:[]}));assert.equal(result.nodes.length,0);
});
test('malformed edges, missing page flag and overlarge pages fail closed',async()=>{
 for(const body of [{},page(Array.from({length:51},()=>({}))),{data:{collections:{edges:[{node:null}],pageInfo:{hasNextPage:false}}}},{data:{collections:{edges:[],pageInfo:{}}}}])await assert.rejects(collectRankingPages(async()=>body),/Invalid/);
});
test('empty progressing pages, missing/oversized/repeated cursors are rejected',async()=>{
 for(const cursor of [null,'','x'.repeat(2049)])await assert.rejects(collectRankingPages(async()=>page([{}],true,cursor)),/pagination/);
 await assert.rejects(collectRankingPages(async()=>page([],true,'next')),/pagination/);
 await assert.rejects(collectRankingPages(async()=>page([{}],true,'same')),/pagination/);
});
