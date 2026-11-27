import {publicIpfsGatewayURLs} from './public-ipfs-gateways.js';
import {validateIPFS,validateTraits} from '../shared/metadata.js';
import {safeFetch} from './safe-fetch.js';
import {ByteCache} from './byte-cache.js';
const cache=new ByteCache({maxBytes:4*1024*1024,maxEntries:200});let active=0;
async function metadata(uri,collection=false,fetcher=safeFetch,env=process.env){
 const urls=publicIpfsGatewayURLs(uri,{env}),key=JSON.stringify([urls,collection]),hit=cache.get(key);if(hit)return hit;let error;const deadline=Date.now()+8000;
 for(const target of urls)try{const remaining=deadline-Date.now();if(remaining<=0)throw Error('Metadata gateway deadline exceeded');const response=await fetcher(target,{maxBytes:524288,timeout:remaining});const json=JSON.parse(response.bytes.toString('utf8'));
  if(!json||typeof json!=='object'||Array.isArray(json)||typeof json.name!=='string'||!json.name.trim())throw Error('Missing metadata name');validateIPFS(json.image);if(json.banner_image)validateIPFS(json.banner_image);if(json.animation_url)validateIPFS(json.animation_url);if(!collection&&json.attributes!==undefined)validateTraits(json.attributes);
  const result={uri,name:json.name.slice(0,180),image:json.image};cache.set(key,result,{ttl:60000});return result;
 }catch(e){error=e}throw error||Error('Metadata gateways unavailable');
}
export function ipfsAPIPlugin({fetcher=safeFetch,env=process.env}={}){return {name:'public-ipfs-preflight',configureServer(server){
 server.middlewares.use('/api/v1/storage/verify',async(req,res)=>{
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.statusCode=405;return res.end(JSON.stringify({error:'GET required'}))}
  const u=new URL(req.url,'http://internal'),directory=u.searchParams.get('directory'),supply=Number(u.searchParams.get('supply')),start=Number(u.searchParams.get('start')||1);
  try{validateIPFS(directory,{directory:true});if(!Number.isInteger(supply)||supply<1||supply>100000||!Number.isInteger(start)||start<1||start>supply)throw Error('Invalid supply/start')}catch(e){res.statusCode=400;return res.end(JSON.stringify({error:e.message}))}
  if(active>=2){res.statusCode=429;return res.end(JSON.stringify({error:'Metadata verification busy; retry later'}))}active++;
  try{
   const end=Math.min(supply,start+7),items=[],collection=start===1?await metadata(directory+'contract.json',true,fetcher,env):null;
   for(let base=start;base<=end;base+=4)items.push(...await Promise.all(Array.from({length:Math.min(4,end-base+1)},(_,n)=>metadata(directory+(base+n)+'.json',false,fetcher,env))));
   res.end(JSON.stringify({directory,collection,items,nextStart:end<supply?end+1:null,checkedAt:new Date().toISOString(),scope:'Public metadata JSON retrieved through configured HTTPS IPFS gateways. IPFS image URI structure checked; image bytes and durable pinning are NOT verified. Results may be cached for 60 seconds.'}));
  }catch(e){res.statusCode=502;res.end(JSON.stringify({error:'Public IPFS metadata validation failed: '+e.message}))}finally{active--}
 });
}}}
