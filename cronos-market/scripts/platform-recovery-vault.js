#!/usr/bin/env node
import {executeRecoveryVaultCli} from '../server/platform-vault-cli.js';
const controller=new AbortController();const stop=()=>controller.abort();process.once('SIGTERM',stop);process.once('SIGINT',stop);
try{const {exitCode,result}=await executeRecoveryVaultCli({argv:process.argv.slice(2),signal:controller.signal});console.log(JSON.stringify(result,null,2));process.exitCode=exitCode}finally{process.removeListener('SIGTERM',stop);process.removeListener('SIGINT',stop)}
