import test from 'node:test';import assert from 'node:assert/strict';
import {artworkSources,artworkCrossOrigin} from '../src/artwork-policy.js';
const api='https://rift-q6qs.onrender.com',cid='QmYwAPJzv5CZsnAzt8auVZRnGpcFvRzCjQRsH7T3zkpKJg';
test('IPFS uses at most three fixed gateways with identical CID/path',()=>{
 const rows=artworkSources('ipfs://'+cid+'/art 1.png',api);assert.equal(rows.length,3);assert.ok(rows.every(s=>s.endsWith('/'+cid+'/art%201.png')));assert.equal(new Set(rows).size,3);
 assert.deepEqual(artworkSources('https://ipfs.io/ipfs/'+cid+'/art%201.png',api),rows);
});
test('reject unsafe metadata image references without substituting invented artwork',()=>{
 for(const s of ['javascript:alert(1)','http://example.com/x','https://user:secret@example.com/x','//evil.example/image','/\\evil/image','ipfs://bad/x','ipfs://'+cid+'/../secret','ipfs://'+cid+'/x?evil','data:text/html,<script/>','x'.repeat(700001)])assert.deepEqual(artworkSources(s,api),[],s.slice(0,50));
});
test('Minted and registered API image paths use exact backend',()=>{
 const hash='a'.repeat(64);assert.deepEqual(artworkSources('https://images.minted.network/?image='+hash,api),[api+'/api/image?hash='+hash]);
 assert.deepEqual(artworkSources('/api/market-art?address=0xabc',api),[api+'/api/market-art?address=0xabc']);
 assert.deepEqual(artworkSources('/logo.svg',api),['/logo.svg']);
});
test('anonymous CORS applies only to configured backend API artwork',()=>{
 assert.equal(artworkCrossOrigin(api+'/api/image?hash=a',api),'anonymous');
 for(const u of ['https://evil.example/api/image',api+'.evil.example/api/image',api+'/other','data:image/png;base64,AAAA'])assert.equal(artworkCrossOrigin(u,api),undefined);
});
test('HTTPS images remain unchanged; malformed gateway references fail closed',()=>{
 assert.deepEqual(artworkSources('https://example.com/art.png',api),['https://example.com/art.png']);
 assert.deepEqual(artworkSources('https://ipfs.io/ipfs/not-a-cid/a.png',api),[]);
});
