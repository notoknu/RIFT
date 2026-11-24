// Restore validation happens before any React state change, for local AND cloud drafts.
export function normalizeLaunchDraft(doc){
 if(!doc||![0,1,2].includes(doc.mode)||!doc.config||Array.isArray(doc.config)||typeof doc.config!=='object')throw Error('Not a compatible RIFT launch draft');
 const text={name:64,symbol:12,description:1000,externalUrl:512,collectionImage:512,collectionBanner:512,imageDirectory:512,start:64,end:64,allowlistEnd:64,root:66,content:512},numbers=new Set(['supply','walletLimit','txLimit','price','royalty']),config={};
 for(const [key,value]of Object.entries(doc.config)){if(Object.hasOwn(text,key)){if(typeof value!=='string'||new TextEncoder().encode(value).length>text[key])throw Error('Invalid draft field: '+key);config[key]=value}else if(numbers.has(key)){if(!['string','number'].includes(typeof value)||String(value).length>100||!Number.isFinite(Number(value))||Number(value)<0)throw Error('Invalid draft field: '+key);config[key]=value}else throw Error('Unknown draft field: '+key)}
 if(doc.svg!==undefined&&(typeof doc.svg!=='string'||new TextEncoder().encode(doc.svg).length>12000))throw Error('Invalid draft SVG');
 if(doc.metadataOverrides!==undefined&&(!doc.metadataOverrides||typeof doc.metadataOverrides!=='object'||Array.isArray(doc.metadataOverrides)))throw Error('Invalid metadata overrides');
 return {mode:doc.mode,config,svg:doc.svg||'',metadataOverrides:doc.metadataOverrides||{}};
}
