import test from 'node:test';import assert from 'node:assert/strict';import {createCreatorTransport} from '../src/creator-transport.js';
test('late unauthenticated 401 cannot cancel pending sign-in or erase newer token',async()=>{
 let fail;const token='c'.repeat(64),t=createCreatorTransport({origin:'https://api.example',fetcher:async u=>u.endsWith('/auth/session')?new Promise(r=>fail=r):new Response(JSON.stringify({sessionToken:token,expiresAt:new Date(Date.now()+3600000).toISOString()}))});
 const old=t.request('/auth/session').catch(e=>e.message);const epoch=t.currentEpoch();
 await t.request('/auth/verify',{method:'POST',sessionEpoch:epoch});
 fail(new Response(JSON.stringify({error:'Not signed in'}),{status:401}));await old;
 assert.equal(t.currentEpoch(),epoch);
});
