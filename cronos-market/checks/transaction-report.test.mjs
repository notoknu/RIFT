import test from 'node:test';import assert from 'node:assert/strict';
import {transactionReport} from '../src/transaction-report.js';
const wallet='0x1111111111111111111111111111111111111111',other='0x2222222222222222222222222222222222222222',hash='0x'+'a'.repeat(64);
const entry={id:'local-id',chainId:25,wallet,action:'Mint NFT',status:'submission-unknown',createdAt:'2026-01-01',hash};
const storage=records=>({getItem:()=>JSON.stringify(records)});
test('report is wallet/chain scoped and preserves uncertainty without performing RPC',()=>{
 const report=transactionReport(wallet,{storage:storage([entry,{...entry,wallet:other},{...entry,chainId:1}]),now:0});assert.equal(report.recordCount,1);assert.equal(report.items[0].status,'submission-unknown');assert.equal(report.items[0].hash,hash);assert.equal(report.format,'rift-transaction-report');assert.match(report.verification,/Unverified/);assert.match(report.recovery,/Hashless/);
});
test('arbitrary context, calldata, notes, tokens and private fields never enter report',()=>{
 const report=transactionReport(wallet,{storage:storage([{...entry,context:'SECRET',data:'SECRET',recoveryNote:'SECRET',privateKey:'SECRET',session:'SECRET',nested:{token:'SECRET'}}])});assert.equal(JSON.stringify(report).includes('SECRET'),false);assert.equal(report.items[0].id,undefined);
});
test('malformed and inaccessible journals fail closed rather than exporting empty success',()=>{
 for(const s of [{getItem(){throw Error('denied')}},{getItem:()=>'{bad'},{getItem:()=>JSON.stringify({records:[]})},{getItem:()=>'x'.repeat(524289)}])assert.throws(()=>transactionReport(wallet,{storage:s}),/no report exported/);
});
test('report bounds records and action labels while rejecting invalid observations',()=>{
 const items=Array.from({length:100},()=>({...entry,action:'x'.repeat(500),blockNumber:-1,nonce:Infinity,hash:'invalid',createdAt:'invalid',status:'arbitrary'}));const report=transactionReport(wallet,{storage:storage(items)});assert.equal(report.recordCount,50);const item=report.items[0];assert.equal(item.action.length,80);assert.equal(item.status,'unrecognized');assert.equal(item.hash,undefined);assert.equal(item.blockNumber,undefined);assert.equal(item.nonce,undefined);assert.equal(item.createdAt,null);
});
test('known safe receipt fields and canonical timestamps are exported without a finality claim',()=>{
 const report=transactionReport(wallet,{storage:storage([{...entry,status:'confirmed',blockNumber:7,nonce:1,startBlock:3,checkedAt:10,blockHash:hash,contractAddress:other}]),now:0});assert.equal(report.items[0].blockNumber,7);assert.equal(report.items[0].contractAddress,other);assert.equal(report.exportedAt,'1970-01-01T00:00:00.000Z');assert.match(report.verification,/not finality/);
});
test('invalid wallet/time is rejected and an absent journal exports an explicit empty report',()=>{
 assert.throws(()=>transactionReport('invalid',{storage:storage([])}),/valid wallet/);for(const now of [-1,Infinity,NaN,8640000000000001])assert.throws(()=>transactionReport(wallet,{storage:storage([]),now}),/report time/);assert.equal(transactionReport(wallet,{storage:{getItem:()=>null}}).recordCount,0);
});
