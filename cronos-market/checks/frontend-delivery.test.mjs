import test from 'node:test';import assert from 'node:assert/strict';import {frontendResponse} from '../edge/frontend.js';
test('API and health never route to static host',async()=>{for(const path of ['/api','/api/v1/auth/nonce','/healthz'])assert.equal(await frontendResponse(new Request('https://rift.example'+path),{SURGE_ORIGIN:'https://rift.surge.sh'},{fetcher:()=>{throw Error('must not fetch')}}),null)});
test('Surge proxy fixes origin and strips sensitive request/response headers',async()=>{let called=false;const r=await frontendResponse(new Request('https://rift.example/collection/one?q=2',{headers:{Cookie:'secret',Authorization:'Bearer secret',Origin:'https://rift.example'}}),{SURGE_ORIGIN:'https://rift.surge.sh'},{fetcher:async(url,opts)=>{called=true;assert.equal(url,'https://rift.surge.sh/collection/one?q=2');assert.deepEqual(Object.keys(opts.headers),['Accept']);assert.equal(opts.redirect,'manual');return new Response('shell',{headers:{'Content-Type':'text/html','Set-Cookie':'bad=1','Access-Control-Allow-Origin':'*'}})}});assert.ok(called);assert.equal(await r.text(),'shell');assert.equal(r.headers.get('set-cookie'),null);assert.equal(r.headers.get('access-control-allow-origin'),null)});
test('unsafe origins and upstream redirects fail closed',async()=>{for(const origin of ['http://rift.surge.sh','https://evil.example','https://rift.surge.sh/path','https://user:pass@rift.surge.sh'])assert.equal((await frontendResponse(new Request('https://rift.example/'),{SURGE_ORIGIN:origin})).status,503);assert.equal((await frontendResponse(new Request('https://rift.example/'),{SURGE_ORIGIN:'https://rift.surge.sh'},{fetcher:async()=>new Response(null,{status:302,headers:{Location:'https://evil.example'}})})).status,502)});
test('asset binding fallback and static methods',async()=>{assert.equal(await(await frontendResponse(new Request('https://rift.example/x'),{ASSETS:{fetch:async()=>new Response('assets')}})).text(),'assets');assert.equal((await frontendResponse(new Request('https://rift.example/x',{method:'POST'}),{})).status,405)});
test('static delivery bounds declared and actual body bytes',async()=>{
 const request=new Request('https://rift.example/a.js'),env={SURGE_ORIGIN:'https://rift.surge.sh'};
 for(const response of [new Response('12345',{headers:{'Content-Length':'5'}}),new Response('12345')])assert.equal((await frontendResponse(request,env,{maxBytes:4,fetcher:async()=>response})).status,502);
});
test('static delivery rejects private files and emits frontend security headers',async()=>{
 for(const path of ['/.env','/%2eenv','/keys/wallet.pem','/app.js.map'])assert.equal((await frontendResponse(new Request('https://rift.example'+path),{})).status,404);
 const r=await frontendResponse(new Request('https://rift.example/'),{ASSETS:{fetch:async()=>new Response('shell',{headers:{'Set-Cookie':'secret=1'}})}});assert.equal(r.headers.get('set-cookie'),null);assert.match(r.headers.get('Content-Security-Policy'),/object-src 'none'/);
});
test('static delivery stops stalled bodies and head has no body',async()=>{
 const request=new Request('https://rift.example/a.js'),env={SURGE_ORIGIN:'https://rift.surge.sh'};
 const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array([1]))}});
 assert.equal((await frontendResponse(request,env,{timeoutMs:20,fetcher:async()=>new Response(stream)})).status,502);
 const head=await frontendResponse(new Request(request.url,{method:'HEAD'}),env,{fetcher:async()=>new Response('body')});assert.equal(await head.text(),'');
});
