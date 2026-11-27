import {boundedBytes} from './creator-service.js';
/** Credential remains server-side. One claimed allocation performs one bounded folder upload.
 * No reusable presigned bearer URL is issued to the browser. */
export function pinataProvider(jwt,{fetcher=fetch,endpoint='https://api.pinata.cloud/pinning/pinFileToIPFS'}={}){
 if(!jwt)return undefined;
 return async (files,{allocationId}={})=>{
  const form=new FormData();for(const file of files)form.append('file',file,file.name);
  if(allocationId)form.append('pinataMetadata',JSON.stringify({name:'RIFT-'+allocationId}));
  form.append('pinataOptions',JSON.stringify({cidVersion:1,wrapWithDirectory:true}));
  const result=await fetcher(endpoint,{method:'POST',headers:{Authorization:'Bearer '+jwt},body:form,signal:AbortSignal.timeout(20000),redirect:'error'});
  if(!result.ok)throw Error('Pin provider rejected upload');
  const data=JSON.parse(new TextDecoder().decode(await boundedBytes(result,65536)));
  return {cid:data.IpfsHash,size:data.PinSize};
 };
}
