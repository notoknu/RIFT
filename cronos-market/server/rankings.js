import fs from 'node:fs';
import {collectRankingPages} from '../shared/ranking-pages.js';
import {boundedBytes} from '../shared/creator-service.js';
import {fileURLToPath} from 'node:url';
import {createRefreshResource} from './refresh-resource.js';
import {createJsonSnapshot} from './json-snapshot.js';
import {validateDirectorySnapshot} from '../shared/directory-snapshot.js';
export {buildDirectory} from '../shared/rankings-core.js';
import {buildDirectory} from '../shared/rankings-core.js';
export async function fetchMintedDirectory({fetcher=globalThis.fetch}={}){
 const {nodes,acquisition}=await collectRankingPages(async payload=>{
  const res=await fetcher('https://api.minted.network/graphql',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000),redirect:'error',credentials:'omit'});
  if(!res.ok)throw Error('Minted HTTP '+res.status);
  return JSON.parse(new TextDecoder().decode(await boundedBytes(res,2097152)));
 });
 const overrides=JSON.parse(fs.readFileSync(new URL('../config/collections.json',import.meta.url),'utf8'));
 return {...buildDirectory(nodes,overrides),acquisition,updatedAt:new Date().toISOString(),stale:false};
}
export function createDirectoryResource({load=fetchMintedDirectory,snapshot=createJsonSnapshot(fileURLToPath(new URL('../data/collections.json',import.meta.url))),...options}={}){
 return createRefreshResource({load,validate:validateDirectorySnapshot,readSaved:snapshot.read,save:snapshot.save,...options});
}
const directoryResource=createDirectoryResource();
export const getDirectory=()=>directoryResource.get();
export function rankingsPlugin({read=getDirectory}={}){return{name:'cronos-rankings',configureServer(server){server.middlewares.use('/api/collections',async(req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');if(req.method!=='GET'){res.statusCode=405;return res.end(JSON.stringify({error:'Method not allowed'}))}try{res.end(JSON.stringify(await read()))}catch(error){res.statusCode=503;if(error.retryAfterMs>0)res.setHeader('Retry-After',String(Math.ceil(error.retryAfterMs/1000)));res.end(JSON.stringify({error:'Minted public data is temporarily unavailable. No API key is required. Try again shortly.',collections:[]}))}})}};}
