import {useEffect,useState} from 'react';
const tabs={Discover:'/discover',Collections:'/collections',Launch:'/create','Buy & sell':'/market',Portfolio:'/account',Favorites:'/favorites',Activity:'/activity',About:'/about'};
export const tabPath=tab=>tabs[tab]||'/discover';
export function parseRoute(location){
 const path=location.pathname.replace(/\/$/,'')||'/',query=new URLSearchParams(location.search);let match;
 if(path==='/'&&query.has('drop'))return {path,tab:'Launch',kind:'tab'};
 if(path==='/'||path==='/discover')return {path,tab:'Discover',kind:'tab'};
 for(const [tab,p]of Object.entries(tabs))if(path===p)return {path,tab,kind:'tab',collection:query.get('collection')||''};
 if(path==='/search')return {path,tab:'Collections',kind:'search',query:query.get('q')||''};
 if((match=path.match(/^\/collection\/(0x[\da-f]{40})$/i)))return {path,tab:'Collections',kind:'collection',address:match[1].toLowerCase()};
 if((match=path.match(/^\/profile\/(0x[\da-f]{40})$/i)))return {path,tab:'Portfolio',kind:'profile',address:match[1].toLowerCase()};
 if((match=path.match(/^\/assets\/25\/(0x[\da-f]{40})\/([0-9]{1,78})$/i))&&BigInt(match[2])<2n**256n)return {path,tab:'Item',kind:'item',address:match[1].toLowerCase(),tokenId:BigInt(match[2]).toString(),standard:query.get('standard')==='ERC-1155'?'ERC-1155':'ERC-721'};
 return {path,tab:'Not found',kind:'notfound'};
}
export function useRoute(){const [route,Route]=useState(()=>parseRoute(location));useEffect(()=>{const listener=()=>Route(parseRoute(location));addEventListener('popstate',listener);return()=>removeEventListener('popstate',listener)},[]);const navigate=path=>{if(location.pathname+location.search!==path)history.pushState({},'',path);Route(parseRoute(location))};return [route,navigate]}
