import test from 'node:test';
import assert from 'node:assert/strict';
import {reduceExchange} from '../shared/exchange.js';
import {validateProductionArtifactBindings} from '../server/owned-production-artifacts.js';
const seller='0x'+'11'.repeat(20),buyer='0x'+'22'.repeat(20),nft='0x'+'33'.repeat(20),zero='0x'+'00'.repeat(20);
const listed=()=>({id:'0',seller,nft,tokenId:'1',quantity:'2',unitPrice:'5',expiry:'0',buyer:zero,multi:true});
const create=()=>reduceExchange(null,{kind:'Listed',payload:listed()});
test('review replay binds order identity, transition type, participants and value',()=>{
 const order=create();
 assert.throws(()=>reduceExchange(order,{kind:'Listed',payload:listed()}),/Duplicate/);
 for(const payload of [{id:'1',buyer,quantity:'1',gross:'5'},{id:'0',buyer:seller,quantity:'1',gross:'5'},{id:'0',buyer,quantity:'3',gross:'15'},{id:'0',buyer,quantity:'1',gross:'6'}])assert.throws(()=>reduceExchange(order,{kind:'Bought',payload}));
 assert.throws(()=>reduceExchange(order,{kind:'OfferClosed',payload:{id:'0',refund:'10'}}));
 const filled=reduceExchange(order,{kind:'Bought',payload:{id:'0',buyer,quantity:'2',gross:'10'}});assert.equal(filled.remaining,'0');
 assert.throws(()=>reduceExchange(filled,{kind:'ListingCancelled',payload:{id:'0'}}));
});
test('offer replay binds criteria, exact token and refund',()=>{
 const payload={id:'0',buyer,nft,tokenId:'1',quantity:'1',unitPrice:'5',expiry:'2000000000',scope:'0',root:'0x'+'00'.repeat(32),multi:false};
 const offer=reduceExchange(null,{kind:'OfferMade',payload});
 assert.throws(()=>reduceExchange(null,{kind:'OfferMade',payload:{...payload,scope:'2'}}));
 assert.throws(()=>reduceExchange(offer,{kind:'OfferFilled',payload:{id:'0',seller,tokenId:'2',quantity:'1',gross:'5'}}));
 assert.throws(()=>reduceExchange(offer,{kind:'OfferClosed',payload:{id:'0',refund:'4'}}));
 assert.equal(reduceExchange(offer,{kind:'OfferClosed',payload:{id:'0',refund:'5'}}).remaining,'0');
});
function artifacts(){const pin='a'.repeat(64),requestDigest='b'.repeat(64);return {receipt:{format:'rift-owned-projection-production-receipt-v1',verified:false,activated:false,datasetId:'example',expiresAt:2000,collectionCount:0,candidateCount:0,evidenceSha256:pin,rebuildLineage:null,collectionRebuildLineages:null,marketplaceRebuildLineage:null,requestDigest},data:{datasetId:'example',generatedAt:1000,expiresAt:2000,collections:[],walletCandidates:[],coverage:{evidenceDigests:[pin]}},evidence:{format:'rift-owned-projection-production-evidence-v1',chainId:25,generatedAt:1000,expiresAt:2000,rebuildLineage:null,collectionRebuildLineages:null},intent:{format:'rift-owned-production-intent-v1',requestDigest,generatedAt:1000}}}
test('artifact binding admits matching metadata and rejects cross-file changes',()=>{
 const a=artifacts();assert.equal(validateProductionArtifactBindings(a),a.data);
 for(const [part,key,value] of [['receipt','datasetId','other'],['receipt','collectionCount',1],['receipt','verified',true],['evidence','generatedAt',999],['evidence','expiresAt',3000],['evidence','rebuildLineage',{}],['intent','requestDigest','c'.repeat(64)],['intent','unexpected',true]]){const b=artifacts();b[part][key]=value;assert.throws(()=>validateProductionArtifactBindings(b),undefined,`${part}.${key}`)}
 const b=artifacts();delete b.intent;assert.throws(()=>validateProductionArtifactBindings(b));
});
