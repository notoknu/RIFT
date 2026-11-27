import {open} from 'node:fs/promises';
import {constants} from 'node:fs';
import {isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {ownedPublicDataSelection,validateOwnedPublicData,OWNED_PUBLIC_DATA_MAX_BYTES} from '../shared/owned-public-data.js';
let active=0;
export async function readOwnedPublicData(env=process.env){
 const selected=ownedPublicDataSelection(env);if(!selected)throw Error('Owned public data not selected');
 if(!isAbsolute(selected.path)||active>=4)throw Error('Owned public data unavailable or busy');active++;let file;
 try{file=await open(selected.path,constants.O_RDONLY|constants.O_NOFOLLOW);const before=await file.stat();if(!before.isFile()||before.nlink!==1||(before.mode&0o022)!==0||before.size<1||before.size>OWNED_PUBLIC_DATA_MAX_BYTES)throw Error('Unsafe owned public data file');const buffer=Buffer.alloc(before.size+1);let n=0;while(n<buffer.length){const r=await file.read(buffer,n,buffer.length-n,n);if(!r.bytesRead)break;n+=r.bytesRead}const after=await file.stat();if(n!==before.size||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs)throw Error('Owned public data changed');const bytes=buffer.subarray(0,n);if(createHash('sha256').update(bytes).digest('hex')!==selected.sha256)throw Error('Owned public data review pin mismatch');return validateOwnedPublicData(JSON.parse(bytes.toString('utf8')))}finally{try{await file?.close()}finally{active--}}
}
