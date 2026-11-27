#!/usr/bin/env node
import {executePlatformOperator} from '../server/platform-exchange-operator.js';
const controller=new AbortController(),stop=()=>controller.abort();process.once('SIGINT',stop);process.once('SIGTERM',stop);
try{const out=await executePlatformOperator({argv:process.argv.slice(2),signal:controller.signal,stdout:line=>process.stdout.write(line+'\n')});process.stdout.write(JSON.stringify(out.result)+'\n');process.exitCode=out.exitCode}
finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop)}
