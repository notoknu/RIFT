import{createHash}from'node:crypto';
export const searchArt=new Map();const hosts=new Set(['images.minted.network','wolfswap.app','assets.wolfswap.gg','ebisusimages.b-cdn.net']);
export function registerArt(src){try{let u=new URL(src);if(u.protocol!=='https:'||!hosts.has(u.hostname)||u.username||u.password||u.port)return null;let key=createHash('sha256').update(u.href).digest('hex');searchArt.set(key,u.href);if(searchArt.size>5000)searchArt.delete(searchArt.keys().next().value);return '/api/search-art?id='+key}catch{return null}}
