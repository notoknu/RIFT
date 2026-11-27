import {accountStorageConfig} from './account-storage-config.js';
import {creatorUploadConfig} from '../shared/creator-upload-config.js';
import {buildReleaseManifest} from '../shared/release-manifest.js';
export function releaseManifest(env=process.env,{now=Date.now()}={}){let uploadConfigured=false;try{uploadConfigured=creatorUploadConfig(env).enabled}catch{}return buildReleaseManifest(env,{now,storageConfigured:accountStorageConfig(env).configured,uploadConfigured,runtime:'node'})}
export function releaseManifestHandler({env=process.env}={}){return(req,res,next)=>{if(!['/',''].includes(req.url.split('?')[0]))return next();res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;res.setHeader('Allow','GET, HEAD');return res.end(JSON.stringify({error:'Method not allowed'}))}const value=releaseManifest(env);res.statusCode=200;res.end(req.method==='HEAD'?undefined:JSON.stringify(value))}}
