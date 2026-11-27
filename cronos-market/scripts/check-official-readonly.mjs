// Read-only public site and wallet observation. Never loads wallet secret material.
import {readFile,writeFile} from 'node:fs/promises';
import {JsonRpcProvider,formatEther} from 'ethers';
const base='https://rift-q6qs.onrender.com';
const address='0x49E3c82Ee961635658b9C5590aa0147B693fA331';
const results=[];
for(const path of ['/','/create','/portfolio','/healthz','/.env','/api/v1/exchange/capabilities','/api/v1/exchange/listings','/api/v1/storage/capabilities','/api/v1/auth/session','/api/v1/launches','/api/v1/status','/api/collections','/api/portfolio?address='+address]){
 const start=Date.now();try{const r=await fetch(base+path,{signal:AbortSignal.timeout(30000),redirect:'manual'});const text=await r.text();let data;try{data=JSON.parse(text)}catch{}let summary;
 if(path==='/api/collections')summary={collections:data?.collections?.length,stale:data?.stale===true,error:data?.error};
 else if(path.startsWith('/api/portfolio'))summary={chainId:data?.chainId,nativeCRO:data?.nativeCRO,nftsFirstPage:data?.nfts?.length,warnings:data?.warnings,error:data?.error};
 else if(path==='/api/v1/launches')summary={count:(data?.launches||data?.items)?.length,error:data?.error};
 else if(path==='/api/v1/auth/session')summary={authenticated:data?.authenticated,error:data?.error};
 else summary=data||{isHTML:/<!doctype|<html/i.test(text),bytes:Buffer.byteLength(text)};
 results.push({path,status:r.status,milliseconds:Date.now()-start,summary});
 }catch{results.push({path,status:'not-verified',reason:'Bounded request failed'})}
}
const p=new JsonRpcProvider('https://evm.cronos.org',25,{staticNetwork:true});let wallet;
try{const chain=await p.send('eth_chainId',[]);if(BigInt(chain)!==25n)throw Error();const [balance,nonce,block]=await Promise.all([p.getBalance(address),p.getTransactionCount(address),p.getBlockNumber()]);wallet={address,chainId:25,balanceCRO:formatEther(balance),nonce,block,scope:'Public on-chain balance/nonce point observation only; no custody/signing or asset completeness acceptance'}}catch{wallet={address,status:'not-verified'}}finally{p.destroy()}
const report={target:base,userReportedPhoneWalletConnection:true,results,wallet,transactionsSent:0,approvalsSubmitted:0,signaturesRequested:0,limitations:'Read-only smoke/point observations only. Not an audit, full functionality/persistence acceptance, or authorization for funded-wallet transactions.'};
await writeFile('/home/user/RIFT-records/official-site-and-public-wallet-review.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
