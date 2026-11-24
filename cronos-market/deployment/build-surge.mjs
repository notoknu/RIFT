import {readFile,writeFile,copyFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';
const origin=process.env.VITE_PUBLIC_API_ORIGIN,creator=process.env.VITE_CREATOR_API_ORIGIN||'';
for(const [name,value] of [['VITE_PUBLIC_API_ORIGIN',origin],['VITE_CREATOR_API_ORIGIN',creator]]){
 if(name==='VITE_CREATOR_API_ORIGIN'&&!value)continue;
 if(!value||new URL(value).origin!==value||!value.startsWith('https://'))throw Error('Set exact HTTPS '+name);
}
const html=await readFile('index.html','utf8');if(!html.includes('/src/main.jsx'))throw Error('Unexpected entry');
const csp="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: wss:; frame-src https://verify.walletconnect.com https://verify.walletconnect.org; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'; manifest-src 'self'";
try{
 const entry=html.replace('/src/main.jsx','/deployment/hosted-entry.js').replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+csp+'"/><meta name="referrer" content="no-referrer"/>');
 await writeFile('index.html',entry);
 const r=spawnSync('npm',['run','build'],{env:process.env,stdio:'inherit'});if(r.status!==0)throw Error('Build failed');
 await copyFile('dist/index.html','dist/200.html');
 await writeFile('dist/deployment-status.json',JSON.stringify({frontend:'https://rift.surge.sh',api:origin,creatorAPI:creator||null,scope:creator?'Creator transport configured; backend provisioning and hosted acceptance still required. No RIFT trading contract configured; native signing unavailable.':'Public reads only; creator accounts/uploads and native vault signing unavailable; no RIFT trading contract configured.'},null,2));
}finally{await writeFile('index.html',html);}
