import {CID} from 'multiformats/cid';
import {safeFetch} from './safe-fetch.js';
import {verifyCarBytes} from '../scripts/verify-car.js';
import {MediaReplicationError} from './media-replication.js';
/** Credential-free gateway fallback with content verification, not gateway trust. */
export function createVerifiedCarGatewayReader({gateways,fetcher=safeFetch,timeoutMs=7000}={}){
 if(!Array.isArray(gateways)||gateways.length<2||gateways.length>5||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>15000)throw new MediaReplicationError('INVALID_CAR_GATEWAYS');
 const origins=new Set();const urls=gateways.map(value=>{let u;try{u=new URL(value)}catch{throw new MediaReplicationError('INVALID_CAR_GATEWAY')}if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/'||u.port&&u.port!=='443'||origins.has(u.origin))throw new MediaReplicationError('INVALID_CAR_GATEWAY');origins.add(u.origin);return u.origin});
 return async function readCar({root,maxBytes=8388608}={}){let cid;try{cid=CID.parse(root).toV1().toString()}catch{throw new MediaReplicationError('INVALID_MEDIA_CID')}if(!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>8388608)throw new MediaReplicationError('MEDIA_READBACK_LIMIT');
  for(const origin of urls)try{const response=await fetcher(origin+'/ipfs/'+cid+'?format=car',{maxBytes,timeout:timeoutMs,redirects:0});if(!Buffer.isBuffer(response.bytes)||response.bytes.length>maxBytes)throw Error();await verifyCarBytes(response.bytes,root);return Buffer.from(response.bytes)}catch{}
  throw new MediaReplicationError('VERIFIED_CAR_GATEWAYS_UNAVAILABLE');
 };
}
