import {chromium,expect} from '@playwright/test';
const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:4175';
const browser=await chromium.launch({args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:393,height:852}});
try{
 await page.addInitScript(()=>{
  window.__walletCalls=[];
  window.ethereum={isMetaMask:true,on(){},removeListener(){},request:async({method})=>{
   window.__walletCalls.push(method);
   if(method==='eth_accounts')return [];
   if(method==='eth_requestAccounts')return new Promise(resolve=>{window.__approveLate=()=>resolve(['0x1111111111111111111111111111111111111111'])});
   if(method==='eth_chainId')return '0x19';
   throw Error('Unexpected wallet request: '+method);
  }};
 });
 await page.goto(base+'/create');
 await page.getByText('Creator account · saved drafts · public IPFS uploads',{exact:true}).click();
 await page.getByRole('button',{name:'Sign in with wallet message',exact:true}).click();
 await page.locator('.wallet-provider-list button').first().click();
 await page.waitForFunction(()=>typeof window.__approveLate==='function');
 await page.getByRole('button',{name:'Close wallet selection',exact:true}).click();
 await expect(page.locator('.wallet-picker')).toHaveCount(0);
 await page.evaluate(()=>window.__approveLate());
 await expect.poll(()=>page.evaluate(()=>window.__walletCalls.filter(m=>m==='eth_requestAccounts').length)).toBe(1);
 // Reopen after the cancelled attempt drains: no saved identity or signing.
 await page.getByRole('button',{name:'Sign in with wallet message',exact:true}).click();
 await expect(page.locator('.wallet-provider-list button').first()).toBeEnabled();
 expect(await page.evaluate(()=>localStorage.getItem('rift:wallet-session:v1'))).toBe(null);
 expect(await page.evaluate(()=>window.__walletCalls.filter(m=>!['eth_accounts','eth_requestAccounts'].includes(m)))).toEqual([]);
 await page.getByRole('button',{name:'Close wallet selection',exact:true}).click();
 console.log('Mobile wallet cancellation: late injected approval cannot sign, switch chain or save identity; picker can reopen.');
}finally{await browser.close()}
