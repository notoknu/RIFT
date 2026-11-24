import React,{useState} from 'react';
const PALETTE=['#101522','#b8f665','#a78bfa','#38bdf8','#fb7185','#fff3c4','#ffffff','#000000'];
export function pixelSVG(pixels){
 if(!Array.isArray(pixels)||pixels.length!==64||pixels.some(c=>c!==null&&!/^#[a-f\d]{6}$/i.test(c)))throw Error('Invalid 8×8 artwork');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">'+pixels.map((c,i)=>c?`<rect x="${i%8}" y="${Math.floor(i/8)}" width="1" height="1" fill="${c}"/>`:'').join('')+'</svg>';
}
export default function PixelBuilder({onApply}){
 const [pixels,Pixels]=useState(()=>Array(64).fill(null)),[color,Color]=useState(PALETTE[1]);
 return <div className="pixel-builder"><h3>Original pixel-art builder</h3><p>Paint your own 8×8 design. Applying uses the supplied-SVG mode: one shared design per edition, unique token IDs—not random traits.</p><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{PALETTE.map(c=><button type="button" key={c} title={c} aria-label={'Paint '+c} aria-pressed={color===c} onClick={()=>Color(c)} style={{background:c,width:28,height:28,border:color===c?'3px solid #fff':'1px solid #888'}}/>)}<button type="button" onClick={()=>Color(null)} aria-pressed={color===null}>Eraser</button></div><div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',width:'min(100%,280px)',aspectRatio:'1',margin:'16px 0'}}>{pixels.map((c,i)=><button type="button" aria-label={'Pixel '+(i+1)} key={i} onClick={()=>Pixels(old=>old.map((v,j)=>i===j?color:v))} style={{padding:0,border:'1px solid #394253',background:c||'#202735',aspectRatio:'1'}}/>)}</div><button type="button" className="secondary" onClick={()=>Pixels(Array(64).fill(null))}>Clear</button><button type="button" className="secondary" disabled={!pixels.some(Boolean)} onClick={()=>onApply(pixelSVG(pixels))}>Use this on-chain SVG</button></div>;
}
