import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewDeviceResult } from '../scripts/review-device-result.js';
test('passing summary never certifies full acceptance or includes raw logs',()=>{
 const result=reviewDeviceResult('private-device-marker\nOK (19 tests)\n',19);
 assert.equal(result.passed,true);assert.equal(result.deviceAcceptanceComplete,false);
 assert.match(result.inputSha256,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify(result).includes('private-device-marker'));
});
test('wrong totals, skips, crashes and duplicate summaries fail closed',()=>{
 for(const raw of ['OK (15 tests)','INSTRUMENTATION_STATUS_CODE: -3\nOK (19 tests)','Process crashed\nOK (19 tests)','OK (19 tests)\nOK (19 tests)'])assert.equal(reviewDeviceResult(raw,19).passed,false);
});
test('expected suite total must be explicit and positive',()=>{
 for(const count of [undefined,0,-1,1.5,NaN])assert.throws(()=>reviewDeviceResult('OK (19 tests)',count));
});
