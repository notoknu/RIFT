// Opt-in live relay diagnostic. Never approves a wallet, signs or sends transactions.
// Serves built files only inside a disposable browser under the production origin.
import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const origin='https://rift-q6qs.onrender.com',root=resolve('dist');
if(!process.argv.includes('--live-relay'))throw Error('Explicit --live-relay required; contacts Reown, creates a temporary pairing proposal and cancels it.');
const report={scope:'Local built UI under intercepted production origin; live relay initiation only, NOT deployed-site or wallet acceptance',projectId:'6192620197a83e8b29a98f8eb68ecc89',status:'not-verified',pairingUriObserved:false,qrImageObserved:false,cancelled:false,savedIdentity:false,walletApproved:false,transactionsSent:0,signaturesRequested:0};
const browser=await chromium.launch({args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:393,height:852}});const page=await context.newPage();
// Record only handshake status and bounded browser error codes, never URLs/auth tokens.
const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');const relayIds=new Set();
report.relayHandshakeStatuses=[];report.relayNetworkErrors=[];
cdp.on('Network.webSocketCreated',event=>{try{const u=new URL(event.url);if(['relay.walletconnect.com','relay.walletconnect.org'].includes(u.hostname)&&relayIds.size<16)relayIds.add(event.requestId)}catch{}});
cdp.on('Network.webSocketHandshakeResponseReceived',event=>{if(relayIds.has(event.requestId)&&report.relayHandshakeStatuses.length<16)report.relayHandshakeStatuses.push(event.response.status)});
cdp.on('Network.webSocketFrameError',event=>{if(relayIds.has(event.requestId)&&report.relayNetworkErrors.length<16){const code=String(event.errorMessage).match(/net::ERR_[A-Z_]+/);report.relayNetworkErrors.push(code?code[0]:'WebSocket handshake/frame failed; details redacted')}});
let relayAcknowledged;const relayAck=new Promise(resolve=>{relayAcknowledged=resolve});
report.relaySubscriptionAcknowledged=false;report.relaySocketObserved=false;report.relaySocketError=false;report.relayRequestMethods=[];
page.on('websocket',socket=>{
 let url;try{url=new URL(socket.url())}catch{return}
 if(url.protocol!=='wss:'||!['relay.walletconnect.com','relay.walletconnect.org'].includes(url.hostname))return;
 report.relaySocketObserved=true;socket.on('socketerror',()=>{report.relaySocketError=true});
 const subscriptions=new Set();
 socket.on('framesent',frame=>{try{const message=JSON.parse(String(frame.payload));if(['irn_subscribe','irn_batchSubscribe','irn_publish'].includes(message.method)&&!report.relayRequestMethods.includes(message.method))report.relayRequestMethods.push(message.method);if(message.method==='irn_subscribe'&&subscriptions.size<64)subscriptions.add(message.id)}catch{}});
 socket.on('framereceived',frame=>{try{const message=JSON.parse(String(frame.payload));if(subscriptions.delete(message.id)&&typeof message.result==='string'&&message.result.length>0&&!message.error){report.relaySubscriptionAcknowledged=true;relayAcknowledged()}}catch{}});
});
const types={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.html':'text/html'};
try{
 await context.route(origin+'/**',async route=>{const u=new URL(route.request().url());if(u.pathname.startsWith('/api/')||u.pathname==='/healthz')return route.fulfill({status:503,contentType:'application/json',body:'{"error":"Diagnostic disables backend calls"}'});let path=resolve(root,'.'+decodeURIComponent(u.pathname));if(path!==root&&!path.startsWith(root+sep))return route.abort();if(!extname(path))path=resolve(root,'index.html');try{await route.fulfill({status:200,contentType:types[extname(path)]||'application/octet-stream',body:await readFile(path)})}catch{await route.fulfill({status:404,body:''})}});
 await page.goto(origin+'/create',{waitUntil:'domcontentloaded'});
 await page.getByText('Creator account · saved drafts · public IPFS uploads',{exact:true}).click();
 await page.getByRole('button',{name:'Sign in with wallet message',exact:true}).click();
 await page.getByRole('button',{name:'WalletConnect · QR / mobile',exact:true}).click();
 await page.locator('.wallet-qr').waitFor({timeout:45000});
 report.pairingUriObserved=true;
 await page.locator('.wallet-qr img').waitFor({timeout:10000});report.qrImageObserved=true;
 report.validatedMobileLinkObserved=await page.getByRole('link',{name:'Open mobile wallet',exact:true}).count()===1;
 // Never activate the link: no installed/funded wallet interaction is authorized here.
 let timer;await Promise.race([relayAck,new Promise(resolve=>{timer=setTimeout(resolve,10000)})]);clearTimeout(timer);
 await page.getByRole('button',{name:'Cancel pairing',exact:true}).click();await page.locator('.wallet-picker').waitFor({state:'detached',timeout:5000});report.cancelled=true;
 report.savedIdentity=await page.evaluate(()=>localStorage.getItem('rift:wallet-session:v1')!==null);
 report.status=report.cancelled&&!report.savedIdentity?'pairing-initiation-observed':'needs-review';
}catch{report.status='not-verified';report.reason='Pairing UI/relay did not complete within the bounded diagnostic. Inspect project/origin/network separately; not proof that the project is invalid.';report.visibleWalletError=await page.locator('.wallet-picker .warning').count()>0;}
finally{await context.close();await browser.close();}
// Never persist pairing URIs, session keys, SDK logs, browser profiles or QR images.
await writeFile(process.env.REOWN_PROBE_REPORT||'REOWN-PAIRING-PROBE.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
if(report.status!=='pairing-initiation-observed')process.exitCode=1;
