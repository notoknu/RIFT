// Pure parsing/binding checks. No ADB calls and no acceptance certification.
const HEX=/^[a-f0-9]{64}$/;
export function expectedDeviceArtifacts(report){
 if(!report||!Number.isSafeInteger(report.versionCode)||report.versionCode<1||report.packageId!=='io.rift.cronos.preview'||!Array.isArray(report.artifacts))throw Error('Valid exact Android build report required');
 const select=suffix=>{const rows=report.artifacts.filter(a=>typeof a.file==='string'&&a.file.endsWith(suffix));if(rows.length!==1||!HEX.test(rows[0].sha256||''))throw Error('Exact app/test APK hashes required');return rows[0].sha256;};
 return {versionCode:report.versionCode,appSha256:select('-preview.apk'),testSha256:select('-native-tests.apk')};
}
export function installedApkPath(output){
 const lines=String(output).trim().split(/\r?\n/);
 if(lines.length!==1||!/^package:\/data\/app\/[A-Za-z0-9~_+=./-]+\/base\.apk$/.test(lines[0]))throw Error('One regular installed base APK required; split/unknown paths not accepted');
 const path=lines[0].slice(8);if(path.split('/').some(part=>part==='.'||part==='..'))throw Error('Unsafe installed APK path');return path;
}
export function verifyInstalledArtifacts({expected,versionOutput,appDigest,testDigest,runnerOutput}){
 const versions=[...String(versionOutput).matchAll(/^\s*versionCode=(\d+)(?:\s|$)/gm)].map(match=>Number(match[1]));
 if(versions.length!==1||versions[0]!==expected.versionCode)throw Error('Installed application version does not match exact build report');
 const digest=value=>String(value).trim().match(/^([a-f0-9]{64})(?:\s|$)/)?.[1];
 if(digest(appDigest)!==expected.appSha256||digest(testDigest)!==expected.testSha256)throw Error('Installed APK hashes do not match exact app/test build artifacts');
 const runner='instrumentation:io.rift.cronos.preview.test/androidx.test.runner.AndroidJUnitRunner (target=io.rift.cronos.preview)';
 if(!String(runnerOutput).split(/\r?\n/).some(line=>line.trim()===runner))throw Error('Expected instrumentation runner/target binding not installed');
 return {matched:true,versionCode:expected.versionCode,appSha256:expected.appSha256,testSha256:expected.testSha256,scope:'Installed artifact identity only, not runtime/device acceptance'};
}
