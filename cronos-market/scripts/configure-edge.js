import {writeFile} from 'node:fs/promises';
import {edgeConfig} from './edge-config.js';
const config=edgeConfig(process.env);
await writeFile('wrangler.generated.json',JSON.stringify(config,null,2)+'\n',{mode:0o600});
console.log('Generated disabled-trading Worker configuration. Review origin/database; apply all supplied migrations before deploy. Scheduling and upload sponsorship are off unless explicitly enabled. No resource created.');
