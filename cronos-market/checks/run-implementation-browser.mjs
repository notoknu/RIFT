import {mkdtemp,rm}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const port='4175',base='http://127.0.0.1:'+port;
const temp=await mkdtemp(join(tmpdir(),'rift-browser-'));
const server=spawn(process.execPath,['server/production.js'],{env:{...process.env,PORT:port,NODE_ENV:'test',REDIS_URL:'',PUBLIC_ORIGIN:base,CREATOR_DB:join(temp,'creator.sqlite')},stdio:'inherit'});
const run=file=>new Promise((resolve,reject)=>{const p=spawn(process.execPath,[file],{env:{...process.env,CHECK_BASE_URL:base},stdio:'inherit'});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(Error(file+' exited '+code)))});
try{
 let ready=false;for(let i=0;i<60;i++){if(server.exitCode!==null)throw Error('Server startup failed');try{const r=await fetch(base+'/healthz',{signal:AbortSignal.timeout(500)});if(r.ok){ready=true;break}}catch{}await delay(250)}
 if(!ready)throw Error('Timed out starting test server');
 await run('checks/implementation-browser.mjs');await run('checks/implementation-layout.mjs');await run('checks/creator-browser.mjs');await run('checks/wallet-cancellation-browser.mjs');await run('checks/exchange-approvals-browser.mjs');await run('checks/transaction-uncertainty-browser.mjs');await run('checks/read-rpc-browser.mjs');await run('checks/comparison-stale-browser.mjs');await run('checks/launch-workflow-browser.mjs');await run('checks/verification-center-browser.mjs');await run('checks/remaining-browser.mjs');await run('checks/platform-browser.mjs');await run('checks/metadata-browser.mjs');await run('checks/ebisu-browser.mjs');await run('checks/device-workspace-browser.mjs');await run('checks/personal-workspace-browser.mjs');await run('checks/device-reads-browser.mjs');
}finally{server.kill('SIGTERM');await rm(temp,{recursive:true,force:true})}
