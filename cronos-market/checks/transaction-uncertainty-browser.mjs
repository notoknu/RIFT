import {chromium,expect} from '@playwright/test';
const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:4175',wallet='0x1111111111111111111111111111111111111111';
const browser=await chromium.launch({args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:393,height:852}});
try{
 await page.addInitScript(wallet=>{
  localStorage.setItem('rift:wallet-session:v1',JSON.stringify({key:'legacy-metamask',name:'MetaMask'}));
  localStorage.setItem('rift:transactions:v1',JSON.stringify([
   {id:'unknown',chainId:25,wallet,action:'Unknown submission fixture',status:'submission-unknown',createdAt:'2026-01-01'},
   {id:'legacy',chainId:25,wallet,action:'Legacy record fixture',status:'not-submitted',createdAt:'2026-01-01'},
  ]));
  window.__transactionCalls=[];window.ethereum={isMetaMask:true,on(){},removeListener(){},request:async({method})=>{window.__transactionCalls.push(method);if(method==='eth_accounts'||method==='eth_requestAccounts')return [wallet];if(method==='eth_chainId')return '0x19';throw Error('Unexpected wallet method '+method);}};
 },wallet);
 await page.goto(base+'/create');await expect(page.locator('.transaction-panel summary')).toContainText('2 recent records');await page.locator('.transaction-panel summary').click();
 await expect(page.locator('.transaction-panel')).toContainText('before repeating this value action');await expect(page.locator('.transaction-panel')).toContainText('Legacy ‘not-submitted’ labels are not proof');
 await page.getByRole('button',{name:'Check receipts & recent confirmations',exact:true}).click();
 await expect(page.getByText('Receipt check finished. No transaction was sent.',{exact:true})).toBeVisible();
 page.once('dialog',dialog=>dialog.accept());const downloading=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export wallet transaction report',exact:true}).click();
 const file=await downloading,stream=await file.createReadStream();let bytes='';for await(const chunk of stream)bytes+=chunk;
 const report=JSON.parse(bytes);expect(report.format).toBe('rift-transaction-report');expect(report.wallet).toBe(wallet);expect(report.recordCount).toBe(2);expect(report.items.map(item=>item.status)).toEqual(['submission-unknown','not-submitted']);expect(report.privacy).toContain('Plaintext');
 expect(await page.evaluate(()=>window.__transactionCalls.filter(method=>!['eth_accounts','eth_requestAccounts','eth_chainId'].includes(method)))).toEqual([]);
 const statuses=await page.evaluate(()=>JSON.parse(localStorage.getItem('rift:transactions:v1')).map(record=>record.status));expect(statuses).toEqual(['submission-unknown','not-submitted']);
 console.log('Hashless transaction recovery browser: explicit unknown/legacy warnings, read-only check makes no receipt lookup/signature/broadcast. Controlled wallet only.');
}finally{await browser.close()}
