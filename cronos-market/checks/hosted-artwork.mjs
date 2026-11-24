import {chromium} from '@playwright/test';
import {writeFile,readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const site=process.env.CHECK_SITE_URL||'https://rift.surge.sh';
const browser=await chromium.launch({args:['--no-sandbox']});
const report={site,checkedAt:new Date().toISOString(),blockedArtwork:[],passed:false};
try {
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 // Optional candidate test serves only static local build bytes at the approved origin.
 // Real backend requests still use the network and real CORS enforcement.
 if(process.env.CHECK_BUILD_DIR){
  const root=resolve(process.env.CHECK_BUILD_DIR),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
  report.candidateBuild=true;
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());if(u.origin!==new URL(site).origin||u.pathname.startsWith('/api/'))return route.continue();
   const file=resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
   if(!file.startsWith(root+sep))return route.abort();
   try{return await route.fulfill({status:200,contentType:types[extname(file)]||'application/octet-stream',body:await readFile(file)})}catch{return route.abort();}
  });
 }
 page.on('requestfailed',r=>{if(r.resourceType()==='image'&&/NotSameOrigin|CORS|CORP/.test(r.failure()?.errorText||''))report.blockedArtwork.push({url:r.url(),error:r.failure().errorText});});
 await page.goto(site,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#root main').waitFor({timeout:30000});
 // Wait only for a small above-the-fold sample; never crawl the whole collection directory.
 await page.waitForFunction(()=>Array.from(document.images).slice(0,3).length===3&&Array.from(document.images).slice(0,3).every(i=>i.complete&&i.naturalWidth>0),{},{timeout:30000}).catch(()=>{});
 report.sample=await page.locator('img').evaluateAll(es=>es.slice(0,3).map(i=>({src:i.src,loaded:i.complete&&i.naturalWidth>0,crossOrigin:i.crossOrigin})));
 report.passed=report.sample.length===3&&report.sample.every(i=>i.loaded)&&report.blockedArtwork.length===0;
 console.log(JSON.stringify(report,null,2));await writeFile(process.env.CHECK_BUILD_DIR?'checks/candidate-artwork.json':'checks/hosted-artwork.json',JSON.stringify(report,null,2)+'\n');
 if(!report.passed)process.exitCode=1;
}finally{await browser.close();}
