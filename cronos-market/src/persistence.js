const KEY='rift:favorites:v1';
export function readFavorites(storage=globalThis.localStorage){try{const value=JSON.parse(storage.getItem(KEY)||'[]');return Array.isArray(value)?[...new Set(value.filter(a=>typeof a==='string'&&/^0x[\da-f]{40}$/i.test(a)).map(a=>a.toLowerCase()))].slice(0,1000):[]}catch{return []}}
export function writeFavorites(value,storage=globalThis.localStorage){try{storage.setItem(KEY,JSON.stringify(value.slice(0,1000)));return true}catch{return false}}
export function normalizeTraits(value){return Array.isArray(value)?value.filter(t=>t&&typeof t==='object'&&typeof t.trait_type==='string'&&['string','number','boolean'].includes(typeof t.value)).slice(0,100):[]}
