#!/usr/bin/env node
// Offline review only: does not upload, connect to a device, or certify lifecycle acceptance.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { instrumentationResult } from './instrumentation-result.js';
export function reviewDeviceResult(raw, expectedTests) {
 const result=instrumentationResult(raw,{expectedTests});
 return {schemaVersion:1,...result,inputSha256:createHash('sha256').update(raw).digest('hex'),deviceAcceptanceComplete:false,remaining:['Verify matching APK hashes and authorized device/run identity','Review original provider artifacts privately','Production vault authentication/biometrics','SAF import/export and process-death recovery','Live WalletConnect pairing and cancellation']};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
 try {
  const [input,count,output,...extra]=process.argv.slice(2);
  if(!input||!/^\d+$/.test(count||'')||!output||extra.length)throw Error('Usage: node scripts/review-device-result.js INPUT.txt EXPECTED_TESTS OUTPUT.json');
  const result=reviewDeviceResult(readFileSync(input,'utf8'),Number(count));
  // Only a digest and verdict are written; raw device logs may contain private information.
  writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed:result.passed,deviceAcceptanceComplete:false}));
  if(!result.passed)process.exitCode=1;
 }catch(error){console.error(error.message);process.exitCode=2;}
}
