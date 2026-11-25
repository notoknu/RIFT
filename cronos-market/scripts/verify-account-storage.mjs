import {mkdtemp,mkdir,rm,stat} from 'node:fs/promises';import {isAbsolute,join,resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {localD1} from '../server/local-d1.js';import {snapshot,restore} from './database-snapshot.js';
/** Non-destructive capability probe in a unique child directory. Never opens an account database. */
export async function verifyAccountStorage(directory){
 if(!isAbsolute(directory))throw Error('Supply an absolute directory on the intended account storage volume');
 await mkdir(directory,{recursive:true,mode:0o700});const temporary=await mkdtemp(join(directory,'.rift-account-probe-'));let db;
 const checks=[];const wallet='0x'+'0'.repeat(40),document=JSON.stringify({displayName:'Disposable storage probe'});
 try{
  const source=join(temporary,'probe.sqlite'),saved=join(temporary,'snapshot.sqlite'),target=join(temporary,'restored.sqlite');db=localD1(source);
  await db.prepare('INSERT INTO creator_profiles(wallet,version,document,updated) VALUES(?,1,?,?)').bind(wallet,document,Date.now()).run();db.close();db=null;
  db=localD1(source);const original=await db.prepare('SELECT version,document FROM creator_profiles WHERE wallet=?').bind(wallet).first();if(original?.document!==document||original.version!==1)throw Error('Database reopen check failed');checks.push('SQLite write/close/reopen');
  const mode=(await stat(source)).mode&0o777;if(mode!==0o600)throw Error('SQLite file permissions must be 0600');checks.push('Database file permissions 0600');
  const manifest=await snapshot(source,saved);if(!manifest.tables.includes('creator_profiles'))throw Error('Profile schema missing from snapshot');checks.push('Online snapshot with profile schema');db.close();db=null;
  await restore(saved,target,{stopped:true});db=localD1(target);const restored=await db.prepare('SELECT version,document FROM creator_profiles WHERE wallet=?').bind(wallet).first();if(restored?.document!==document||restored.version!==1)throw Error('Isolated restore check failed');checks.push('Checksum-validated fresh-destination restore');
  return {schemaVersion:1,checkedAt:new Date().toISOString(),status:'local-capabilities-passed',checks,productionApproved:false,durabilityVerified:false,scope:'Disposable SQLite and recovery capability probe only. Existing account databases were not opened. Host restart, Render redeploy, off-host retention and actual persistent mount remain unverified.'};
 }finally{db?.close();await rm(temporary,{recursive:true,force:true})}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{console.log(JSON.stringify(await verifyAccountStorage(process.argv[2]||''),null,2))}catch{console.error('Account storage check failed. Confirm an absolute writable directory and inspect locally; no account contents or filesystem paths are printed.');process.exitCode=1}}
