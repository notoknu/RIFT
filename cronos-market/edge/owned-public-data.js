import {boundedBytes} from '../shared/creator-service.js';
import {ownedPublicDataSelection,validateOwnedPublicData,OWNED_PUBLIC_DATA_MAX_BYTES} from '../shared/owned-public-data.js';
/** Owned ASSETS binding only: never fetch an operator URL or user-selected host. */
export async function readEdgeOwnedPublicData(env){
 const selected=ownedPublicDataSelection(env);if(!selected||!env.ASSETS||!/^\/owned-public-data\/[A-Za-z0-9_-]{1,100}\.json$/.test(selected.path))throw Error('Owned public data asset configuration invalid');
 const response=await env.ASSETS.fetch(new Request('https://owned-public-data.invalid'+selected.path,{redirect:'error',signal:AbortSignal.timeout(5000)}));if(!response.ok||response.redirected)throw Error('Owned public data asset unavailable');const bytes=await boundedBytes(response,OWNED_PUBLIC_DATA_MAX_BYTES),digest=await crypto.subtle.digest('SHA-256',bytes),sha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');if(sha256!==selected.sha256)throw Error('Owned public data review pin mismatch');return validateOwnedPublicData(JSON.parse(new TextDecoder().decode(bytes)));
}
