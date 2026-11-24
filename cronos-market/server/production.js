import {venueSnapshotPlugin} from './venue-snapshot.js';
import {collectionProfilePlugin} from './collection-profile.js';
import {statusAPIPlugin} from './status-api.js';
import {collectionAPIPlugin} from './collection-api.js';
import {exchangeAPIPlugin} from './exchange-api.js';
import{creatorAPIPlugin}from'./creator-api.js';
import{ipfsAPIPlugin}from'./ipfs-api.js';
import{marketAPIPlugin}from'./market-api.js';
import{createClient}from'redis';
import express from'express';import{resolve}from'node:path';import{fileURLToPath}from'node:url';import{apiSecurity}from'./security.js';import{portfolioPlugin}from'./portfolio.js';import{walletArtPlugin}from'./wallet-assets.js';import{metadataAuditPlugin}from'./metadata-audit.js';import{searchPlugin}from'./search.js';import{crosscheckPlugin}from'./crosscheck.js';import{rankingsPlugin}from'./rankings.js';import{imagePlugin}from'./images.js';
const app=express();app.disable('x-powered-by'); // No blind trust-proxy: configure trusted proxy IPs at deployment.
if(process.env.TRUSTED_PROXY)app.set('trust proxy',process.env.TRUSTED_PROXY.split(','));
const production=process.env.NODE_ENV==='production';if(production&&!process.env.REDIS_URL&&process.env.ALLOW_SINGLE_PROCESS_LIMITS!=='1')throw Error('Set REDIS_URL or explicitly select ALLOW_SINGLE_PROCESS_LIMITS=1 for one server only');let redis;if(process.env.REDIS_URL){redis=createClient({url:process.env.REDIS_URL,socket:{connectTimeout:5000}});redis.on('error',()=>console.error('Redis unavailable'));await redis.connect()}const metrics=apiSecurity(app,{production,redis});
app.get('/healthz',(req,res)=>res.status(redis&&!redis.isReady?503:200).json({status:redis&&!redis.isReady?'degraded':'ok',chainId:25}));
for(const plugin of[creatorAPIPlugin(),statusAPIPlugin(),venueSnapshotPlugin(),collectionProfilePlugin(),collectionAPIPlugin(),exchangeAPIPlugin(),ipfsAPIPlugin(),marketAPIPlugin(),portfolioPlugin(),walletArtPlugin(),rankingsPlugin(),imagePlugin(),crosscheckPlugin(),searchPlugin(),metadataAuditPlugin()])plugin.configureServer({middlewares:app});
app.use('/api',(req,res)=>res.status(404).json({error:'Unknown endpoint'}));const root=resolve(fileURLToPath(new URL('..',import.meta.url)),'dist');app.use(express.static(root,{index:false,maxAge:0}));app.get('/{*path}',(req,res)=>res.sendFile(resolve(root,'index.html')));app.use((err,req,res,next)=>{console.error('Request failed:',err.message);if(!res.headersSent)res.status(500).json({error:'Service unavailable'})});
const port=Number(process.env.PORT||4173);const server=app.listen(port,'0.0.0.0',()=>console.log(`RIFT production server listening on ${port}`));server.requestTimeout=30000;server.headersTimeout=15000;process.on('SIGTERM',()=>{server.close(()=>redis?.quit());setTimeout(()=>process.exit(1),15000).unref()});setInterval(()=>console.log(JSON.stringify({event:'service-metrics',...metrics})),60000).unref();
