import {readEdgeMetadata} from './public-upstream.js';
/** Factory registration uses the same bounded metadata/gateway policy as public
 * reads. This is ordinary JSON retrieval, not verified CAR or durable pinning. */
export async function edgeMetadata(uri,env){return readEdgeMetadata(uri,env,{deadline:Date.now()+8000})}
