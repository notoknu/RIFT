import {readFile,writeFile,stat,mkdir,rename,unlink} from 'node:fs/promises';
import {dirname} from 'node:path';import {randomUUID} from 'node:crypto';
// Atomic replacement prevents partial JSON readers; not fsync/off-host durability certification.
export function createJsonSnapshot(file,{maxBytes=2097152}={}){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<128||maxBytes>4194304)throw Error('Invalid JSON snapshot limit');
 return {
  async read(){try{if((await stat(file)).size>maxBytes)throw Error('Snapshot too large');const bytes=await readFile(file);if(bytes.length>maxBytes)throw Error('Snapshot too large');return JSON.parse(bytes.toString('utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}},
  async save(value){const text=JSON.stringify(value);if(typeof text!=='string'||Buffer.byteLength(text)>maxBytes)throw Error('Snapshot too large');await mkdir(dirname(file),{recursive:true,mode:0o700});const temporary=file+'.'+randomUUID()+'.tmp';try{await writeFile(temporary,text,{flag:'wx',mode:0o600});await rename(temporary,file);}finally{await unlink(temporary).catch(()=>{});}},
 };
}
