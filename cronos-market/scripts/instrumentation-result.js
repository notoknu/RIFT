export function instrumentationResult(output,{expectedTests}={}) {
 if(typeof output!=='string'||!Number.isSafeInteger(expectedTests)||expectedTests<1)throw Error('Explicit expected instrumentation test count required');
 const matches=[...output.matchAll(/^\s*OK \((\d+) tests?\)\s*$/gm)];
 const executed=matches.length===1?Number(matches[0][1]):null;
 const skipped=[...output.matchAll(/INSTRUMENTATION_STATUS_CODE:\s*(-3|-4)\s*$/gm)].length;
 const failed=/FAILURES!!!|INSTRUMENTATION_FAILED|Process crashed|INSTRUMENTATION_ABORTED|shortMsg=|INSTRUMENTATION_STATUS_CODE:\s*-(?:1|2)\s*$/m.test(output);
 return {expectedTests,executedTests:executed,skippedTests:skipped,failed,passed:!failed&&skipped===0&&executed===expectedTests,scope:'Instrumentation summary only. Not complete device, biometric, wallet, SAF or lifecycle acceptance.'};
}
