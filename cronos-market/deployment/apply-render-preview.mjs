import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const file='server/production.js',source=await readFile(file,'utf8');
if(createHash('sha256').update(source).digest('hex')!=='0d4759abb2f3f3b311df5cd609cdf04b2157b9b07a697f7a4f7f64b81231a6fd')throw Error('Repository server changed; review and regenerate deployment patch.');
const anchor="const app=express();app.disable('x-powered-by');";
if(!source.includes(anchor))throw Error('Missing server anchor');
const cors=await readFile('deployment/public-cors.mjs','utf8');await writeFile('server/public-cors.mjs',cors);
await writeFile(file,"import {publicReadCors} from './public-cors.mjs';\n"+source.replace(anchor,anchor+"app.use(publicReadCors('https://rift.surge.sh',{creatorBearer:process.env.CREATOR_AUTH_TRANSPORT==='bearer'}));"));
console.log('Applied exact Surge origin policy. Creator writes require explicit bearer transport; all other cross-origin writes remain disabled.');
