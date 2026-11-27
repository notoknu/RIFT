import {ownedPublicDataSelection,ownedDirectory} from '../shared/owned-public-data.js';
import {readOwnedPublicData} from './owned-public-data.js';
import {walletArt} from './wallet-assets.js';
import {createPublicDataSnapshot} from './public-data-snapshot.js';
import {publicDataURL} from '../shared/public-data-providers.js';
import {publicDataFetch} from './public-data-fetch.js';
import fs from 'node:fs';
import {collectRankingPages} from '../shared/ranking-pages.js';
import {boundedBytes} from '../shared/creator-service.js';
import {createRefreshResource} from './refresh-resource.js';
import {validateDirectorySnapshot} from '../shared/directory-snapshot.js';
export {buildDirectory} from '../shared/rankings-core.js';
import {buildDirectory} from '../shared/rankings-core.js';
export async function fetchMintedDirectory({fetcher=publicDataFetch,env=process.env}={}){
 const {nodes,acquisition}=await collectRankingPages(async payload=>{
  const res=await fetcher(publicDataURL('minted','graphql',{},env),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000),redirect:'error',credentials:'omit'});
  if(!res.ok)throw Error('Minted HTTP '+res.status);
  return JSON.parse(new TextDecoder().decode(await boundedBytes(res,2097152)));
 });
 const overrides=JSON.parse(fs.readFileSync(new URL('../config/collections.json',import.meta.url),'utf8'));
 return {...buildDirectory(nodes,overrides),acquisition,updatedAt:new Date().toISOString(),stale:false};
}
export function createDirectoryResource({load=fetchMintedDirectory,snapshot=createPublicDataSnapshot('rankings',['minted']),...options}={}){
 const resource=createRefreshResource({load,validate:validateDirectorySnapshot,readSaved:snapshot.read,save:snapshot.save,...options});return {...resource,get(){snapshot.assertSelected?.();return resource.get()}};
}
const directoryResource=createDirectoryResource();
export const getDirectory=async()=>{if(ownedPublicDataSelection()){const result=ownedDirectory(await readOwnedPublicData());result.collections=result.collections.map(r=>({...r,image:walletArt(r.image)}));return result}return directoryResource.get()};
export function rankingsPlugin({read=getDirectory}={}){return{name:'cronos-rankings',configureServer(server){server.middlewares.use('/api/collections',async(req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');if(req.method!=='GET'){res.statusCode=405;return res.end(JSON.stringify({error:'Method not allowed'}))}try{res.end(JSON.stringify(await read()))}catch(error){res.statusCode=503;if(error.retryAfterMs>0)res.setHeader('Retry-After',String(Math.ceil(error.retryAfterMs/1000)));res.end(JSON.stringify({error:'Selected public directory data is unavailable, expired or cooling down; no substitute figures.',collections:[]}))}})}};}
