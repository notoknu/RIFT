import {chromium,expect} from '@playwright/test';
import {Interface,ZeroHash} from 'ethers';
import {readFile} from 'node:fs/promises';
const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:4175';
const abi=new Interface(JSON.parse(await readFile('public/drop-contract.json','utf8')).abi);
const browser=await chromium.launch({args:['--no-sandbox']});const page=await browser.newPage();
let primary=0,fallback=0;
try{
 await page.route('https://evm.cronos.org/**',async route=>{primary++;await route.fulfill({status:503,body:'unavailable'})});
 await page.route('https://cronos-evm-rpc.publicnode.com/**',async route=>{
  fallback++;const body=route.request().postDataJSON();let result;
  if(body.method==='eth_chainId')result='0x19';
  else if(body.method==='eth_blockNumber')result='0x100';
  else if(body.method==='eth_getBlockByNumber'){expect(body.params).toEqual(['0x100',false]);result={number:'0x100',hash:'0x'+'a'.repeat(64)}}
  else if(body.method==='eth_call'){
   expect(body.params[1]).toBe('0x100');
   const fn=abi.getFunction(body.params[0].data.slice(0,10));
   const values={name:'Fallback Read Collection',totalMinted:1,maxSupply:100,mintPrice:0,walletLimit:2,txLimit:2,storageMode:0,owner:'0x1111111111111111111111111111111111111111',paused:false,start:0,end:0,merkleRoot:ZeroHash,allowlistEnd:0};
   if(!(fn.name in values))throw Error('Unexpected contract read '+fn.name);
   result=abi.encodeFunctionResult(fn,[values[fn.name]]);
  }else throw Error('Unexpected RPC method '+body.method);
  await route.fulfill({json:{jsonrpc:'2.0',id:body.id,result}});
 });
 await page.goto(base+'/create');
 const csp=(await page.request.get(base+'/healthz')).headers()['content-security-policy'];expect(csp).toContain('https://cronos-evm-rpc.publicnode.com');
 await page.getByPlaceholder('0x… deployed RIFT Drop address').fill('0x1111111111111111111111111111111111111111');
 await page.getByRole('button',{name:'Load collection',exact:false}).click();
 await expect(page.locator('.loaded-drop h2')).toHaveText('Fallback Read Collection');
 await expect(page.locator('.loaded-drop')).toContainText('Read at block 256');expect(primary).toBe(1);expect(fallback).toBeGreaterThan(1);
 // Delayed read cancellation must not publish late data or try another provider.
 await page.unroute('https://evm.cronos.org/**');
 let release,entered;const started=new Promise(resolve=>entered=resolve);const held=new Promise(resolve=>release=resolve);
 await page.route('https://evm.cronos.org/**',async route=>{entered();await held;const body=route.request().postDataJSON();await route.fulfill({json:{jsonrpc:'2.0',id:body.id,result:'0x19'}}).catch(()=>{});});
 await page.reload();const beforeFallback=fallback;
 await page.getByPlaceholder('0x… deployed RIFT Drop address').fill('0x1111111111111111111111111111111111111111');
 await page.getByRole('button',{name:'Load collection',exact:false}).click();await started;
 await page.getByRole('button',{name:'Cancel collection read',exact:true}).click();
 await expect(page.getByRole('button',{name:'Cancel collection read',exact:true})).toHaveCount(0);
 release();await expect(page.locator('.loaded-drop')).toHaveCount(0);expect(fallback).toBe(beforeFallback);
 console.log('Launch read-only fallback/CSP and active read-cancellation browser regression passed (mocked endpoints, no wallet).');
}finally{await browser.close()}
