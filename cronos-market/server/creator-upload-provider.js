import {pinataProvider} from '../shared/pinata-provider.js';import {creatorUploadConfig} from '../shared/creator-upload-config.js';import {publicPost} from './public-post.js';
/** Node authenticated multipart uploader with pinned public DNS, bounded response and no redirects. */
export function creatorUploadProvider(env=process.env,{requester=publicPost}={}){
 const config=creatorUploadConfig(env);if(!config.enabled)return undefined;
 const provider=pinataProvider(config.token,{endpoint:config.url,fetcher:async(url,options)=>{const request=new Request(url,{method:'POST',body:options.body});const body=Buffer.from(await request.arrayBuffer());if(body.length>2359296)throw Error('Upload envelope too large');const response=await requester(url,{body,authorization:options.headers.Authorization,contentType:request.headers.get('content-type'),maxBytes:65536,timeoutMs:20000,signal:options.signal});return new Response(response.bytes,{status:200})}});Object.defineProperty(provider,'providerLabel',{value:config.label});return provider;
}
