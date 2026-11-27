#!/usr/bin/env node
import {executeVaultReplicaCli} from '../server/platform-vault-replica-cli.js';
const controller=new AbortController(),stop=()=>controller.abort();process.once('SIGINT',stop);process.once('SIGTERM',stop);
try{const {exitCode,result}=await executeVaultReplicaCli({argv:process.argv.slice(2),signal:controller.signal});console.log(JSON.stringify(result,null,2));process.exitCode=exitCode}finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop)}
