import test from 'node:test';import assert from 'node:assert/strict';
import {expectedDeviceArtifacts,installedApkPath,verifyInstalledArtifacts} from '../scripts/device-artifact-policy.js';
const report={versionCode:26,packageId:'io.rift.cronos.preview',artifacts:[{file:'RIFT-v26-preview.apk',sha256:'a'.repeat(64)},{file:'RIFT-v26-native-tests.apk',sha256:'b'.repeat(64)}]};
const expected=expectedDeviceArtifacts(report);
const valid={expected,versionOutput:'    versionCode=26 minSdk=26 targetSdk=35',appDigest:'a'.repeat(64)+'  /data/app/a/base.apk',testDigest:'b'.repeat(64)+'  /data/app/b/base.apk',runnerOutput:'instrumentation:io.rift.cronos.preview.test/androidx.test.runner.AndroidJUnitRunner (target=io.rift.cronos.preview)'};
test('exact app/test hashes, version and target bind installed artifacts',()=>{assert.equal(verifyInstalledArtifacts(valid).matched,true);assert.equal(installedApkPath('package:/data/app/~~ABC==/io.rift-X_Y=/base.apk\n'),'/data/app/~~ABC==/io.rift-X_Y=/base.apk');});
test('missing, duplicate or malformed build artifact identity is rejected',()=>{
 for(const value of [null,{...report,versionCode:0},{...report,packageId:'other'},{...report,artifacts:[report.artifacts[0]]},{...report,artifacts:[...report.artifacts,report.artifacts[0]]},{...report,artifacts:[{...report.artifacts[0],sha256:'wrong'},report.artifacts[1]]}])assert.throws(()=>expectedDeviceArtifacts(value));
});
test('split, traversal, injection and unknown install paths fail closed',()=>{
 for(const value of ['package:/data/app/x/base.apk\npackage:/data/app/x/split.apk','package:/data/app/../base.apk','package:/data/app/x/./base.apk','package:/sdcard/x/base.apk','package:/data/app/x;echo/base.apk','package:/data/app/x/$(id)/base.apk',''])assert.throws(()=>installedApkPath(value));
});
test('stale versions, ambiguous versions and mismatched hashes block instrumentation binding',()=>{
 for(const patch of [{versionOutput:' versionCode=25 minSdk=26'},{versionOutput:' versionCode=26\n versionCode=26'},{appDigest:'c'.repeat(64)},{testDigest:'c'.repeat(64)},{runnerOutput:valid.runnerOutput.replace('target=io.rift.cronos.preview','target=other')},{runnerOutput:''}])assert.throws(()=>verifyInstalledArtifacts({...valid,...patch}));
});
