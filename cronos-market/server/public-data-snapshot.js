import {createHash} from 'node:crypto';
import {isAbsolute,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {publicDataProviders,requirePublicDataProviders} from '../shared/public-data-providers.js';
import {createJsonSnapshot} from './json-snapshot.js';
/** Snapshots are scoped to protocol + configured origin, not assumed portable
 * across providers. Existing unscoped historical snapshots are never deleted. */
export function createPublicDataSnapshot(name,ids,{env=process.env,maxBytes=2097152}={}){
 if(!/^[a-z][a-z0-9-]{0,63}$/.test(name)||!Array.isArray(ids)||!ids.length)throw Error('Invalid provider snapshot scope');
 const identity=()=>{const p=publicDataProviders(env);if(ids.some(id=>!p[id]))throw Error('Unknown provider scope');return JSON.stringify(ids.map(id=>p[id]))};const selected=identity(),digest=createHash('sha256').update(selected).digest('hex');
 const root=env.RIFT_PUBLIC_SNAPSHOT_DIR||fileURLToPath(new URL('../data/public-provider-snapshots/',import.meta.url));if(!isAbsolute(root))throw Error('Absolute public snapshot directory required');const store=createJsonSnapshot(join(root,name+'-'+digest+'.json'),{maxBytes});
 const assertSelected=()=>{requirePublicDataProviders(ids,env);if(identity()!==selected)throw Error('Provider selection changed; drained restart required')};
 return {assertSelected,async read(){assertSelected();return store.read()},async save(value){assertSelected();return store.save(value)}};
}
