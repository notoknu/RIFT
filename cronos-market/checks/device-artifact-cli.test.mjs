import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const checker=fileURLToPath(new URL('../scripts/android-device-check.js',import.meta.url));
const build=JSON.parse(await readFile(new URL('../ANDROID-BUILD-REPORT.json',import.meta.url),'utf8'));
const fake=`#!/usr/bin/env node
const fs=require('node:fs');const a=process.argv.slice(2);fs.appendFileSync(process.env.CALL_LOG,JSON.stringify(a)+'\\n');const b=JSON.parse(process.env.BUILD),mode=process.env.CASE;
if(a[0]==='devices'){console.log('List of devices attached\\nprivate-test-serial device product:test');process.exit(0)}
const c=a.slice(3).join(' ');let value;
if(c.startsWith('getprop'))value='26';
else if(c==='dumpsys webviewupdate')value='Current WebView package: test-provider';
else if(c==='dumpsys package io.rift.cronos.preview')value=' versionCode='+b.versionCode+' minSdk=26';
else if(c.startsWith('pm path'))value='package:/data/app/'+(c.endsWith('.test')?'tests':'app')+'/base.apk';
else if(c.startsWith('sha256sum'))value=(c.includes('/tests/')?b.artifacts.find(x=>x.file.endsWith('-native-tests.apk')).sha256:mode==='mismatch'?'c'.repeat(64):b.artifacts.find(x=>x.file.endsWith('-preview.apk')).sha256)+'  file';
else if(c==='pm list instrumentation')value='instrumentation:io.rift.cronos.preview.test/androidx.test.runner.AndroidJUnitRunner (target='+(mode==='runner'?'other':'io.rift.cronos.preview')+')';
else if(c.startsWith('am instrument'))value='private-transcript-marker\\nOK (19 tests)';
else process.exit(1);console.log(value);
`;
for(const mode of ['pass','mismatch','runner','invalid-count'])test('device checker exact-identity integration: '+mode,async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rift-fake-adb-'));
 try{const adb=join(dir,'adb.cjs'),log=join(dir,'calls.jsonl');await writeFile(adb,fake,{mode:0o700});const args=[checker,'--run-instrumentation',...(mode==='invalid-count'?['--expected-tests=0']:[])];
 const result=spawnSync(process.execPath,args,{cwd:dir,encoding:'utf8',env:{...process.env,ADB_PATH:adb,ANDROID_SERIAL:'private-test-serial',BUILD:JSON.stringify(build),CASE:mode,CALL_LOG:log}});
 const report=JSON.parse(await readFile(join(dir,'checks/android-device-availability.json'),'utf8'));const calls=await readFile(log,'utf8').catch(()=>'');
 assert.equal(result.status,mode==='pass'?0:2);assert.equal(calls.includes('"instrument"'),mode==='pass');assert.doesNotMatch(JSON.stringify(report),/private-transcript-marker|private-test-serial/);
 if(mode==='pass'){assert.equal(report.checks.find(c=>c.name==='Exact installed application/test identity').binding.matched,true);assert.match(report.checks.at(-1).transcriptSha256,/^[a-f0-9]{64}$/);assert.equal(report.status,'instrumentation-passed-device-acceptance-still-required');}
 }finally{await rm(dir,{recursive:true,force:true})}
});
