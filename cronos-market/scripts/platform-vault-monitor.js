#!/usr/bin/env node
import {executeVaultMonitorCli} from '../server/platform-vault-monitor-cli.js';
const controller=new AbortController(),stop=()=>controller.abort();process.once('SIGINT',stop);process.once('SIGTERM',stop);
const emit=event=>new Promise((resolve,reject)=>process.stdout.write(JSON.stringify(event)+'\n',error=>error?reject(error):resolve()));
// A broken pipe is a failed local sink, not an acknowledged external notification.
process.stdout.on('error',()=>{});
try{const {exitCode,result}=await executeVaultMonitorCli({argv:process.argv.slice(2),signal:controller.signal,onEvent:emit});try{await emit(result);process.exitCode=exitCode}catch{process.exitCode=2}}finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop)}
