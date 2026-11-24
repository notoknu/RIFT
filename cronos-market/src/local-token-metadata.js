// Local-only decoder: never fetches a URI or injects HTML/SVG into the document.
export function inspectTokenURI(uri){
 if(typeof uri!=='string'||new TextEncoder().encode(uri).length>65536)throw Error('Token URI exceeds the local 64 KiB inspection limit');
 if(!uri.toLowerCase().startsWith('data:'))return {kind:uri.startsWith('ipfs://')?'ipfs-reference':uri.startsWith('https://')?'https-reference':'unsupported-reference',uri,warning:'Reference only. Metadata/media was NOT fetched; availability, safety, authenticity and retention are not verified.'};
 const match=uri.match(/^data:application\/json(?:(?:;charset=utf-8)|(?:;utf8))?(;base64)?,([\s\S]*)$/i);if(!match)throw Error('Only JSON data URIs can be inspected locally');let text;
 try{if(match[1]){if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(match[2]))throw Error();const binary=atob(match[2]);if(btoa(binary)!==match[2])throw Error();text=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0)))}else text=decodeURIComponent(match[2])}catch{throw Error('Invalid JSON data URI encoding')}
 if(new TextEncoder().encode(text).length>65536)throw Error('Decoded metadata exceeds 64 KiB');let data;try{data=JSON.parse(text)}catch{throw Error('Token data URI does not contain valid JSON')}if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Metadata must be a JSON object');
 return inspectMetadataObject(data,'embedded-json');
}
export function inspectMetadataObject(data,kind='external-json'){
 if(!data||typeof data!=='object'||Array.isArray(data)||new TextEncoder().encode(JSON.stringify(data)).length>65536)throw Error('Metadata must be a bounded JSON object');
 const small=(value,max)=>typeof value==='string'&&value.length<=max?value:'';
 const attributes=(Array.isArray(data.attributes)?data.attributes.slice(0,100):[]).filter(t=>t&&typeof t==='object'&&!Array.isArray(t)&&typeof t.trait_type==='string'&&t.trait_type.length<=120&&(['string','boolean'].includes(typeof t.value)||typeof t.value==='number'&&Number.isFinite(t.value))&&String(t.value).length<=500).map(t=>({trait_type:t.trait_type,value:t.value}));
 return {kind,name:small(data.name,200),description:small(data.description,4000),imageReference:small(data.image,16384),attributes,warning:'Untrusted metadata; source and content integrity are not certified. Artwork/HTML/SVG is not executed or rendered; this does not establish authenticity, ownership or marketplace support.'};
}
