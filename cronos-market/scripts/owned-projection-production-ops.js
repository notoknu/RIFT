import {readProductionBytes,loadOwnedProductionRequest,requireProduction as need,productionExact} from '../server/owned-production-config.js';
import {runOwnedProductionWorkflow,inspectOwnedProduction} from '../server/owned-production-workflow.js';
try{
 need(process.argv.length===3,'PRODUCER_CONFIG_REQUIRED');const c=JSON.parse(await readProductionBytes(process.argv[2],65536));
 if(c?.action==='inspect'){need(productionExact(c,['version','action','outputDirectory','receiptSha256'])&&c.version===1,'PRODUCER_INSPECTION_INVALID');console.log(JSON.stringify(await inspectOwnedProduction(c),null,2))}
 else console.log(JSON.stringify(await runOwnedProductionWorkflow(await loadOwnedProductionRequest(process.argv[2])),null,2));
}catch(e){console.error(JSON.stringify({code:/^[A-Z_]{1,90}$/.test(e.code||'')?e.code:'OWNED_PROJECTION_PRODUCTION_FAILED',partialOutputPossible:true,verified:false,activated:false,scope:'Preserve partial artifacts. Matching complete files can resume; changed/truncated files require review and are never overwritten.'}));process.exitCode=2}
