import {chromium,expect} from '@playwright/test';
import {Interface,keccak256} from 'ethers';
const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:4175';
const wallet='0x1111111111111111111111111111111111111111',spender='0x2222222222222222222222222222222222222222',nft='0x3333333333333333333333333333333333333333';
const iface=new Interface(['function supportsInterface(bytes4) view returns(bool)','function getApproved(uint256) view returns(address)','function ownerOf(uint256) view returns(address)','function isApprovedForAll(address,address) view returns(bool)']);
const browser=await chromium.launch({args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:393,height:852}});
try{
 await page.exposeFunction('approvalFixtureRead',tx=>{const fn=iface.getFunction(tx.data.slice(0,10));const value={supportsInterface:true,getApproved:spender,ownerOf:wallet,isApprovedForAll:false}[fn.name];return iface.encodeFunctionResult(fn,[value]);});
 await page.addInitScript(wallet=>{window.__approvalRequests=[];window.ethereum={isMetaMask:true,on(){},removeListener(){},request:async({method,params})=>{window.__approvalRequests.push(method);if(['eth_accounts','eth_requestAccounts'].includes(method))return [wallet];if(method==='eth_chainId')return '0x19';if(method==='eth_blockNumber')return '0x100';if(method==='eth_getCode')return '0x6000';if(method==='eth_call')return window.approvalFixtureRead(params[0]);throw Error('Unexpected wallet action '+method);}};},wallet);
 await page.route('**/api/v1/exchange/capabilities',r=>r.fulfill({json:{configured:true,tradingEnabled:false,address:spender,runtimeHash:keccak256('0x6000')}}));
 await page.route('**/api/v1/exchange/listings**',r=>r.fulfill({json:{items:[],nextCursor:null,coverage:{scope:'Controlled browser fixture'}}}));
 await page.goto(base);await page.locator('header nav').getByRole('button',{name:'Buy & sell',exact:true}).click();
 await page.getByText('Inspect / revoke exchange NFT approvals',{exact:true}).click();
 await page.getByLabel('NFT approval contract',{exact:true}).fill(nft);await page.getByRole('button',{name:'Inspect current exchange approvals',exact:true}).click();
 await page.locator('.wallet-provider-list button').first().click();
 await expect(page.getByRole('button',{name:'Review token approval revocation',exact:true})).toBeVisible();
 await expect(page.getByText('Owned-token approval: ACTIVE',{exact:false})).toBeVisible();
 await expect(page.getByText('Observation block: 256',{exact:false})).toBeVisible();
 expect(await page.evaluate(()=>window.__approvalRequests.filter(m=>['eth_sendTransaction','personal_sign','eth_signTypedData_v4'].includes(m)))).toEqual([]);
 await page.getByLabel('NFT approval contract',{exact:true}).fill(wallet);
 await expect(page.getByRole('button',{name:'Review token approval revocation',exact:true})).toHaveCount(0);
 console.log('Approval inspection mobile browser: works while trading disabled, no signature/transaction, changed input clears observation. Controlled wallet, not device acceptance.');
}finally{await browser.close()}
