import {artworkSources,artworkCrossOrigin} from './artwork-policy.js';
import React,{useState,useEffect}from'react';import{ImageOff}from'lucide-react';
export function localImage(src){return artworkSources(src)[0]||null;}
export default function Artwork({src,alt='',loading='lazy',...props}){
 const[attempt,A]=useState(0),[failed,F]=useState(false);
 useEffect(()=>{A(0);F(false)},[src]);
 useEffect(()=>{if(!failed||attempt>=2)return;const t=setTimeout(()=>{A(a=>a+1);F(false)},1000*(attempt+1));return()=>clearTimeout(t)},[failed,attempt,src]);
 const candidates=artworkSources(src),url=candidates[Math.min(attempt,Math.max(0,candidates.length-1))];
 return <>{url&&!failed?<img {...props} key={url+':'+attempt} crossOrigin={artworkCrossOrigin(url)} referrerPolicy="no-referrer" src={url} alt={alt} loading={loading} decoding="async" onError={()=>F(true)}/>:null}{(!url||failed)&&<span className="image-fallback" role="img" aria-label={alt||'Collection artwork unavailable'}><ImageOff size={25}/><span>{failed&&attempt<2?'Retrying artwork…':'Artwork unavailable'}</span></span>}</>;
}
