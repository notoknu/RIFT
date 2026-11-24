export function registryCard(c){return {address:c.address,name:c.display_title||c.name,description:c.display_description||c.description||'',image:c.display_image||c.image_uri||null,banner:c.display_banner||c.banner_uri||null,primarySource:'RIFT factory registry',sources:['RIFT factory registry'],providerVerified:false,standard:'ERC-721',category:'Registered launch',categorySource:'Factory deployment receipt',floor:null,volumeTotal:null,volume7d:null,owners:null,items:null,allTimeRank:null,weeklyRank:null,currency:'CRO'}}
export async function searchWithRegistry(query,signal){
 const fetchJSON=async url=>{const r=await fetch(url,{signal});const j=await r.json();if(!r.ok)throw Error(j.error||'Source unavailable');return j};
 const [provider,registry]=await Promise.allSettled([fetchJSON('/api/search?q='+encodeURIComponent(query)),fetchJSON('/api/v1/launches?q='+encodeURIComponent(query))]);
 if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
 if(provider.status==='rejected'&&registry.status==='rejected')throw Error('Collection sources are temporarily unavailable');
 const base=provider.status==='fulfilled'?provider.value:{collections:[],sources:[],warnings:['Venue search is unavailable; showing matching RIFT registrations only.'],page:0,hasMore:false,updatedAt:new Date().toISOString(),coverage:'RIFT factory registrations only; external source unavailable.'};
 const map=new Map((base.collections||[]).map(c=>[c.address.toLowerCase(),c]));
 if(registry.status==='fulfilled')for(const c of registry.value.collections){const card=registryCard(c),existing=map.get(card.address);map.set(card.address,existing?{...existing,name:card.name,image:card.image||existing.image,banner:card.banner||existing.banner,description:card.description||existing.description,sources:[...new Set([...(existing.sources||[]),'RIFT factory registry'])]}:card)}
 return {...base,collections:[...map.values()],sources:[...(base.sources||[]),{name:'RIFT factory registry',status:registry.status==='fulfilled'?'ok':'unavailable'}]};
}
