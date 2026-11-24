import {cp,mkdir,readdir,rm,writeFile,readFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),source=resolve(root,'dist'),target=resolve(root,'android/app/src/main/assets');
await readFile(resolve(source,'index.html'));
await mkdir(target,{recursive:true});await rm(resolve(target,'web'),{recursive:true,force:true});await cp(source,resolve(target,'web'),{recursive:true});
const files=[];async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){const file=resolve(path,entry.name);if(entry.isSymbolicLink())throw Error('Symlinks are not allowed in Android assets');if(entry.isDirectory())await walk(file);else files.push(file)}}await walk(resolve(target,'web'));
const manifest=[];for(const file of files.sort()){const name=relative(resolve(target,'web'),file).replaceAll('\\','/');manifest.push({file:name,sha256:createHash('sha256').update(await readFile(file)).digest('hex')})}
await writeFile(resolve(target,'web-files.txt'),manifest.map(f=>f.file).join('\n')+'\n');await writeFile(resolve(target,'web-manifest.json'),JSON.stringify({files:manifest},null,2)+'\n');console.log('Bundled '+manifest.length+' frontend assets. Android API origin is configured at Gradle build time.');
