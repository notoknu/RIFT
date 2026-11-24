import{ByteCache}from'./byte-cache.js';
// Explorer is a best-effort source, not an authoritative wallet indexer.
const cache=new ByteCache({maxBytes:16*1024*1024,maxEntries:100}),pending=new Map();
export async function scanExplorer(address,type,{fetchPage=fetchExplorerPage,maxPages=50,ttl=60000}={}){
 const key=address.toLowerCase()+':'+type;
 if(ttl&&cache.get(key)?.until>Date.now())return cache.get(key).data;
 if(ttl&&pending.has(key))return pending.get(key);
 const task=(async()=>{const deadline=Date.now()+25000;const first=await fetchPage(address,type,1),all=[...first.result],reported=Number(first.pagination?.totalRecord||all.length),pages=Math.min(maxPages,Number(first.pagination?.totalPage||1)),failures=[];let next=2;
 await Promise.all(Array.from({length:Math.min(3,Math.max(0,pages-1))},async()=>{while(next<=pages){const page=next++;if(Date.now()>deadline){failures.push(page);continue}try{const result=await fetchPage(address,type,page);all.push(...result.result)}catch{failures.push(page)}}}));
 const rows=[...new Map(all.filter(r=>r&&typeof r.tokenAddress==='string').map(r=>[r.tokenAddress.toLowerCase()+':'+(r.tokenId??''),r])).values()].sort((a,b)=>a.tokenAddress.localeCompare(b.tokenAddress)||String(a.tokenId??'').localeCompare(String(b.tokenId??''),undefined,{numeric:true}));
 const notes=[];if(pages>1)notes.push('Explorer pagination is not snapshot-stable; duplicates are removed but assets may still be missed.');if(failures.length)notes.push(`${failures.length} explorer pages failed; discovery is partial.`);if(rows.length<reported)notes.push(`Discovered ${rows.length} unique entries of ${reported} reported; use manual import for missing assets.`);if(Number(first.pagination?.totalPage)>maxPages)notes.push('Explorer scan page safety limit reached.');
 const data={...first,result:rows,discovery:{unique:rows.length,reported,pagesScanned:pages,failedPages:failures,notes},pagination:{...first.pagination,totalPage:Math.ceil(rows.length/24)}};
 if(ttl){cache.set(key,{until:Date.now()+ttl,data});if(cache.size>100)cache.delete(cache.keys().next().value)}return data;})();
 if(ttl)pending.set(key,task);try{return await task}finally{if(ttl)pending.delete(key)}
}
async function fetchExplorerPage(address,type,page){const r=await fetch(`https://explorer.cronos.com/table/${type}?address=${address}&p=${page}&ps=100`,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Explorer unavailable');const reader=r.body.getReader();let size=0,chunks=[];try{while(true){let{done,value}=await reader.read();if(done)break;size+=value.length;if(size>5000000)throw Error('Explorer response too large');chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}let html=Buffer.concat(chunks).toString('utf8'),m=html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);if(!m)throw Error('Explorer format unavailable');const props=JSON.parse(m[1]).props?.pageProps;if(props?.scope!==type||!Array.isArray(props?.data?.result))throw Error('Explorer format unavailable');return props.data}
