import {writeFile} from 'node:fs/promises';import {edgeConfig} from './edge-config.js';
const env={...process.env,PUBLIC_ORIGIN:'https://rift.surge.sh',WORKER_NAME:process.env.WORKER_NAME||'rift-creator-api',SURGE_ORIGIN:''};
const config=edgeConfig(env);delete config.assets;delete config.triggers;
config.vars.CREATOR_AUTH_TRANSPORT='bearer';
await writeFile('wrangler.creator.generated.json',JSON.stringify(config,null,2)+'\n',{mode:0o600});
console.log('Generated API-only Worker/D1 configuration for exact https://rift.surge.sh origin. No resource created, deployed or charged. Upload sponsorship, scheduled indexing and trading remain off.');
