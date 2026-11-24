import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import {fileURLToPath} from 'node:url';
export async function hostedSmoke(base,{fetcher=fetch,allowLocal=false}={}){
 const url=new URL(base);if(url.origin!==base||url.username||url.password||!(url.protocol==='https:'||allowLocal&&url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Expected exact public HTTPS origin');
 const checks=[];
 async function check(name,path,validate){try{const r=await fetcher(base+path,{redirect:'manual',signal:AbortSignal.timeout(20000),headers:{Accept:path==='/'||path==='/about'?'text/html':'application/json'}});await validate(r);checks.push({name,status:'pass'})}catch(e){checks.push({name,status:'fail',detail:e.message})}}
 await check('frontend shell','/',async r=>{if(!r.ok||!r.headers.get('content-type')?.includes('text/html'))throw Error('Expected HTML shell');if(!(await r.text()).includes('/assets/'))throw Error('Missing built application assets')});
 await check('SPA deep link','/about',async r=>{if(!r.ok||!r.headers.get('content-type')?.includes('text/html'))throw Error('Expected SPA HTML fallback')});
 await check('health JSON','/healthz',async r=>{const j=await r.json();if(!r.ok||j.status!=='ok'||j.chainId!==25)throw Error('Unhealthy or wrong chain')});
 await check('unknown API does not become HTML','/api/not-a-real-endpoint',async r=>{if(r.status!==404||!r.headers.get('content-type')?.includes('application/json'))throw Error('API fallback/routing error');await r.json()});
 await check('private paths blocked','/.env',async r=>{if(r.status!==404)throw Error('Private path not refused')});
 await check('creator/D1 capabilities','/api/v1/storage/capabilities',async r=>{if(!r.ok||!r.headers.get('content-type')?.includes('application/json'))throw Error('Creator API or D1 unavailable');await r.json()});
 return {target:base,checkedAt:new Date().toISOString(),checks,passed:checks.every(c=>c.status==='pass'),limitations:'Read-only smoke test, not audit, persistence/load acceptance, wallet transaction proof or mainnet approval.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const report=await hostedSmoke(process.env.CHECK_BASE_URL);console.log(JSON.stringify(report,null,2));await writeFile('checks/hosted-smoke.json',JSON.stringify(report,null,2)+'\n');if(!report.passed)process.exitCode=1}
