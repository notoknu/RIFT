#!/usr/bin/env node
import {executeUnifiedRecoveryCli} from '../server/platform-unified-cli.js';
const controller=new AbortController(),abort=()=>controller.abort();process.once('SIGINT',abort);process.once('SIGTERM',abort);
try{const r=await executeUnifiedRecoveryCli({argv:process.argv.slice(2),signal:controller.signal});process.stdout.write(JSON.stringify(r.result)+'\n');process.exitCode=r.exitCode}
finally{process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort)}
