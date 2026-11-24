// Accept only a bounded PNG data URI returned by the scoped native converter.
// Never let metadata's image URL become an <img> request through this component.
export function validateRasterPreview(value){
 if(!value||typeof value!=='object'||typeof value.dataUri!=='string'||value.dataUri.length>87406||!/^data:image\/png;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.dataUri))throw Error('Invalid native raster preview');
 const encoded=value.dataUri.slice(22),raw=atob(encoded);if(btoa(raw)!==encoded||raw.length<33||raw.length>65536)throw Error('Preview PNG budget/encoding mismatch');const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));if(![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)||new DataView(bytes.buffer).getUint32(8)!==13||String.fromCharCode(...bytes.slice(12,16))!=='IHDR')throw Error('Preview PNG signature mismatch');const view=new DataView(bytes.buffer),width=view.getUint32(16),height=view.getUint32(20);if(width<1||height<1||width>256||height>256||value.width!==width||value.height!==height||value.outputBytes!==raw.length)throw Error('Preview dimensions/size mismatch');return {dataUri:value.dataUri,width,height};
}
