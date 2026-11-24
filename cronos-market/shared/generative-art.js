import {keccak256,toUtf8Bytes} from 'ethers';
const COLOR=/^#[\da-f]{6}$/i;
const SHAPES={rect:['x','y','width','height','rx'],circle:['cx','cy','r'],ellipse:['cx','cy','rx','ry'],line:['x1','y1','x2','y2'],polygon:['points'],path:['d']};
function text(value,max=80){if(typeof value!=='string'||!value.trim()||value.length>max||/[\x00-\x1f]/.test(value))throw Error('Invalid recipe text');return value}
export function validateRecipe(recipe){
 if(!recipe||recipe.version!==1||!Number.isInteger(recipe.size)||recipe.size<16||recipe.size>2048||!Array.isArray(recipe.layers)||!recipe.layers.length||recipe.layers.length>8)throw Error('Use recipe v1, size 16–2048 and 1–8 layers');text(recipe.seed,128);
 const names=new Set();let combinations=1n;
 for(const layer of recipe.layers){text(layer.name);if(names.has(layer.name))throw Error('Duplicate layer name');names.add(layer.name);if(!Array.isArray(layer.variants)||!layer.variants.length||layer.variants.length>16)throw Error('Use 1–16 variants per layer');combinations*=BigInt(layer.variants.length);const variants=new Set();
  for(const variant of layer.variants){text(variant.name);if(variants.has(variant.name))throw Error('Duplicate variant name');variants.add(variant.name);if(!Array.isArray(variant.shapes)||variant.shapes.length>32)throw Error('Maximum 32 shapes per variant');
   for(const shape of variant.shapes){const attributes=SHAPES[shape.type];if(!attributes)throw Error('Unsupported shape');if(Object.keys(shape).some(k=>!['type','fill','stroke','strokeWidth','opacity',...attributes].includes(k)))throw Error('Unknown shape property');
    for(const key of ['fill','stroke'])if(shape[key]!==undefined&&shape[key]!=='none'&&!COLOR.test(shape[key]))throw Error('Use six-digit hex colors or none');
    for(const [key,value] of Object.entries(shape)){if(['type','fill','stroke'].includes(key))continue;
     if(key==='d'){if(typeof value!=='string'||value.length>2000||!/^\s*[Mm][MmZzLlHhVvCcSsQqTtAaEe\d\s.,+\-]*$/.test(value))throw Error('Invalid path data')}
     else if(key==='points'){if(typeof value!=='string'||value.length>2000||!/^[-+\d\s.,]+$/.test(value))throw Error('Invalid polygon points')}
     else if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>8192||['width','height','r','rx','ry','strokeWidth'].includes(key)&&value<0||key==='opacity'&&(value<0||value>1))throw Error('Invalid shape number');
    }
   }
  }
 }
 return {combinations};
}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const gcd=(a,b)=>{while(b){const t=b;b=a%b;a=t}return a};
/** A seeded bijection over mixed-radix combinations: unique recipes without retry loops. */
export function generateArt(recipe,supply){
 const {combinations}=validateRecipe(recipe);if(!Number.isInteger(supply)||supply<1||supply>2000||BigInt(supply)>combinations)throw Error('Supply must be 1–2000 and no larger than available trait combinations');
 const seed=BigInt(keccak256(toUtf8Bytes(recipe.seed)));let a=(seed>>128n)%combinations||1n;while(gcd(a,combinations)!==1n)a++;const b=seed%combinations;
 const items=[];let bytes=0;
 for(let i=0;i<supply;i++){let code=(a*BigInt(i)+b)%combinations;const attributes=[],shapes=[];
  for(const layer of recipe.layers){const variant=layer.variants[Number(code%BigInt(layer.variants.length))];code/=BigInt(layer.variants.length);attributes.push({trait_type:layer.name,value:variant.name});
   for(const shape of variant.shapes){const attrs=Object.entries(shape).filter(([k])=>k!=='type').map(([k,v])=>`${k==='strokeWidth'?'stroke-width':k}="${escape(v)}"`).join(' ');shapes.push(`<${shape.type} ${attrs}/>`)}
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${recipe.size} ${recipe.size}" width="${recipe.size}" height="${recipe.size}">${shapes.join('')}</svg>`;bytes+=toUtf8Bytes(svg).length;if(bytes>32*1024*1024)throw Error('Artwork export exceeds 32 MiB safety limit');items.push({id:i+1,svg,attributes,contentHash:keccak256(toUtf8Bytes(svg))});
 }
 return items;
}
export const STARTER_RECIPE={version:1,size:320,seed:'change-this-original-art-seed',layers:[
 {name:'Background',variants:[{name:'Midnight',shapes:[{type:'rect',x:0,y:0,width:320,height:320,fill:'#101522'}]},{name:'Plum',shapes:[{type:'rect',x:0,y:0,width:320,height:320,fill:'#302044'}]},{name:'Ocean',shapes:[{type:'rect',x:0,y:0,width:320,height:320,fill:'#12394a'}]}]},
 {name:'Core',variants:[{name:'Lime',shapes:[{type:'polygon',points:'160,45 265,105 265,225 160,285 55,225 55,105',fill:'#b8f665'}]},{name:'Ice',shapes:[{type:'circle',cx:160,cy:165,r:110,fill:'#38bdf8'}]},{name:'Rose',shapes:[{type:'rect',x:55,y:55,width:210,height:220,rx:55,fill:'#fb7185'}]}]},
 {name:'Eyes',variants:[{name:'Focused',shapes:[{type:'rect',x:90,y:125,width:45,height:24,fill:'#101522'},{type:'rect',x:185,y:125,width:45,height:24,fill:'#101522'}]},{name:'Awake',shapes:[{type:'circle',cx:110,cy:140,r:22,fill:'#101522'},{type:'circle',cx:210,cy:140,r:22,fill:'#101522'}]},{name:'Visor',shapes:[{type:'rect',x:80,y:115,width:160,height:48,rx:15,fill:'#101522'},{type:'line',x1:95,y1:130,x2:175,y2:130,stroke:'#ffffff',strokeWidth:4}]}]},
 {name:'Emblem',variants:[{name:'Bolt',shapes:[{type:'polygon',points:'165,185 140,220 158,220 150,250 183,207 165,207',fill:'#101522'}]},{name:'Ring',shapes:[{type:'circle',cx:160,cy:215,r:22,fill:'none',stroke:'#101522',strokeWidth:10}]}]}
]};
