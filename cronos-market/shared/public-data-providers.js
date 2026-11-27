const defaults=Object.freeze({ebisu:{origin:'https://api.wolfswap.gg',contract:'wolfswap-ebisu-v1'},minted:{origin:'https://api.minted.network',contract:'minted-graphql-v1'},explorer:{origin:'https://explorer.cronos.com',contract:'cronos-next-table-v1'}});
const need=(v,code)=>{if(!v){const e=new Error(code);e.code=code;throw e}};
export function publicDataProviders(env=globalThis.process?.env||{}){
 let raw={};if(env.RIFT_PUBLIC_DATA_PROVIDERS_JSON!==undefined){need(typeof env.RIFT_PUBLIC_DATA_PROVIDERS_JSON==='string'&&env.RIFT_PUBLIC_DATA_PROVIDERS_JSON.length<=16384,'PUBLIC_DATA_CONFIG_INVALID');try{raw=JSON.parse(env.RIFT_PUBLIC_DATA_PROVIDERS_JSON)}catch{need(false,'PUBLIC_DATA_CONFIG_INVALID')}}
 need(raw&&typeof raw==='object'&&!Array.isArray(raw)&&Object.keys(raw).every(k=>Object.hasOwn(defaults,k)),'PUBLIC_DATA_CONFIG_INVALID');
 return Object.fromEntries(Object.entries(defaults).map(([id,builtin])=>{
  const selected=raw[id];if(selected===undefined)return [id,{id,mode:'builtin',...builtin}];
  need(selected&&typeof selected==='object'&&!Array.isArray(selected),'PUBLIC_DATA_CONFIG_INVALID');
  if(selected.mode==='disabled'){need(Object.keys(selected).join(',')==='mode','PUBLIC_DATA_CONFIG_INVALID');return [id,{id,mode:'disabled',contract:builtin.contract,origin:null}]}
  need(Object.keys(selected).sort().join(',')==='approvedHost,contract,mode,origin'&&selected.mode==='compatible'&&selected.contract===builtin.contract,'PUBLIC_DATA_CONTRACT_UNSUPPORTED');
  let u;try{u=new URL(selected.origin)}catch{need(false,'PUBLIC_DATA_CONFIG_INVALID')}
  const h=selected.approvedHost;need(typeof h==='string'&&h===h.toLowerCase()&&/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h)&&!['.local','.localhost','.internal','.lan','.test'].some(s=>h.endsWith(s))&&u.hostname===h&&u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&u.origin===selected.origin,'PUBLIC_DATA_ORIGIN_INVALID');return [id,{id,mode:'compatible',origin:u.origin,contract:builtin.contract}];
 }));
}
export function publicDataSelectionKey(env=globalThis.process?.env||{}){return JSON.stringify(publicDataProviders(env))}
export function requirePublicDataProviders(ids,env=globalThis.process?.env||{}){const selections=publicDataProviders(env);for(const id of ids)need(selections[id]&&selections[id].mode!=='disabled','PUBLIC_DATA_PROVIDER_DISABLED');return selections}
export function publicDataURL(id,operation,query={},env=globalThis.process?.env||{}){
 const provider=requirePublicDataProviders([id],env)[id];let path;
 if(id==='ebisu'&&['ranked','catalog'].includes(operation))path=operation==='ranked'?'/factions/ebisus/collections-ranked':'/factions/ebisus/collections';
 else if(id==='minted'&&operation==='graphql')path='/graphql';
 else if(id==='explorer'&&['nftTokenBalance','erc20TokenBalance'].includes(operation))path='/table/'+operation;
 else need(false,'PUBLIC_DATA_OPERATION_UNSUPPORTED');
 need(query&&typeof query==='object'&&!Array.isArray(query)&&Object.entries(query).every(([k,v])=>/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(k)&&['string','number','boolean'].includes(typeof v)&&String(v).length<=4096),'PUBLIC_DATA_QUERY_INVALID');const u=new URL(path,provider.origin);u.search=new URLSearchParams(Object.entries(query).map(([k,v])=>[k,String(v)])).toString();return u;
}

export const PUBLIC_DATA_PROTOCOLS=Object.freeze(Object.entries(defaults).map(([id,p])=>Object.freeze({id,contract:p.contract,defaultOrigin:p.origin,modes:Object.freeze(['builtin','compatible','disabled']),scope:'Public read-only compatible data protocol. Source attribution remains provider-reported; mirror selection is not independent data ownership or complete history.'})));
