import {validatePublicAPIOrigin} from './public-hosting.js';
// Deliberately never touches localStorage, sessionStorage, IndexedDB or cookies in split mode.
export function createCreatorTransport({origin='',fetcher=(...args)=>globalThis.fetch(...args),now=()=>Date.now()}={}){
 validatePublicAPIOrigin(origin);let token='',expires=0,epoch=0;
 const clear=()=>{token='';expires=0;epoch++};
 async function request(path,{method='GET',body,signal,sessionEpoch}={}){
  if(sessionEpoch!==undefined&&sessionEpoch!==epoch)throw Error('Sign-in was cancelled; sign in again');
  if(typeof path!=='string'||!/^\/[a-z0-9/?=&._%-]+$/i.test(path)||path.includes('..')||path.startsWith('//'))throw Error('Invalid creator route');
  if(token&&expires<=now())clear();
  const form=typeof FormData!=='undefined'&&body instanceof FormData;
  const headers=body!==undefined&&!form?{'Content-Type':'application/json'}:{};
  if(origin&&token)headers.Authorization='Bearer '+token;
  const generation=epoch;
  const response=await fetcher(origin+'/api/v1'+path,{method,credentials:origin?'omit':'same-origin',redirect:'error',cache:'no-store',headers,body:body===undefined?undefined:form?body:JSON.stringify(body),signal});
  let data;try{data=await response.json()}catch{throw Error('Creator API returned an invalid response')}
  if(!response.ok){if(response.status===401&&origin&&generation===epoch&&headers.Authorization&&headers.Authorization==='Bearer '+token)clear();throw Error(data.error||'Creator request failed');}
  if(origin&&path==='/auth/verify'){
   const until=Date.parse(data.expiresAt);
   if(generation!==epoch)throw Error('Sign-in was cancelled; sign in again');
   if(!/^[a-f0-9]{64}$/.test(data.sessionToken||'')||!Number.isFinite(until)||until<=now()||until>now()+3605000)throw Error('Invalid creator session response');
   token=data.sessionToken;expires=until;
  }
  if(path==='/auth/logout')clear();
  const {sessionToken:discarded,...safe}=data;return safe;
 }
 return {request,clear,currentEpoch:()=>epoch};
}
