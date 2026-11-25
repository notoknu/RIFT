import test from 'node:test';import assert from 'node:assert/strict';
import {fetchMintedDirectory} from '../server/rankings.js';
const node={address:'0x'+'1'.repeat(40),name:'Controlled provider fixture',chain:{name:'CRONOS'},volume:{volumeAllNative:'10',volume7dNative:'1'}};
const page={data:{collections:{edges:[{node}],pageInfo:{hasNextPage:false}}}};
test('Node rankings use shared bounded acquisition and omit browser credentials/redirects',async()=>{
 const calls=[];const result=await fetchMintedDirectory({fetcher:async(url,options)=>{calls.push({url,options});return Response.json(page);}});
 assert.equal(calls.length,2);assert.equal(result.collections.length,1);assert.equal(result.observations.duplicateRows,1);assert.equal(result.acquisition.periods.length,2);assert.equal(result.acquisition.atomicSnapshot,false);assert.equal(calls[0].options.redirect,'error');assert.equal(calls[0].options.credentials,'omit');assert.equal(result.stale,false);
});
test('Node rankings reject HTTP failures, partial errors and oversized response bodies',async()=>{
 for(const make of [()=>new Response('',{status:429}),()=>Response.json({...page,errors:[{message:'partial'}]}),()=>new Response('x'.repeat(2097153))])await assert.rejects(fetchMintedDirectory({fetcher:async()=>make()}));
});
test('different provider observations of the same address cannot silently change rank totals',async()=>{
 let requests=0;await assert.rejects(fetchMintedDirectory({fetcher:async()=>Response.json(requests++?{data:{collections:{edges:[{node:{...node,volume:{volumeAllNative:'11',volume7dNative:'1'}}}],pageInfo:{hasNextPage:false}}}}:page)}),/Conflicting/);
});
