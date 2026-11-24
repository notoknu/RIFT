import {validateWorkspaceBackup} from './device-workspace.js';
export const BACKUP_PLAINTEXT_MAX=4*1024*1024,BACKUP_ENVELOPE_MAX=6*1024*1024,BACKUP_KDF_ITERATIONS=310000;
const FORMAT='rift-encrypted-personal-workspace',encoder=new TextEncoder();
function passwordBytes(passphrase){if(typeof passphrase!=='string'||passphrase.length<12||encoder.encode(passphrase).length>1024)throw Error('Use a backup passphrase of at least 12 characters and at most 1024 UTF-8 bytes');return encoder.encode(passphrase)}
function cryptoAPI(crypto){if(!crypto?.subtle||!crypto.getRandomValues)throw Error('Encrypted backups require Web Crypto in a secure browser/app context');return crypto}
function base64(bytes){let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(binary)}
function unbase64(value,max){if(typeof value!=='string'||value.length>Math.ceil(max/3)*4||value.length%4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))throw Error('Invalid encrypted backup encoding');const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));if(bytes.length>max||base64(bytes)!==value)throw Error('Invalid encrypted backup encoding');return bytes}
async function key(crypto,bytes,salt){try{const material=await crypto.subtle.importKey('raw',bytes,'PBKDF2',false,['deriveKey']);return await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:BACKUP_KDF_ITERATIONS},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}finally{bytes.fill(0)}}
const aad=encoder.encode(FORMAT+':1:PBKDF2-SHA256:310000:AES-256-GCM');
export async function encryptWorkspaceBackup(backup,account,passphrase,{crypto=globalThis.crypto}={}){
 cryptoAPI(crypto);const clean=validateWorkspaceBackup(backup,account),plaintext=encoder.encode(JSON.stringify({format:'rift-personal-workspace',schema:1,chainId:25,account,...clean}));if(plaintext.length>BACKUP_PLAINTEXT_MAX)throw Error('Backup exceeds 4 MiB');
 const password=passwordBytes(passphrase),salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 try{const derived=await key(crypto,password,salt),ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad,tagLength:128},derived,plaintext));return JSON.stringify({format:FORMAT,schema:1,kdf:'PBKDF2-SHA256',iterations:BACKUP_KDF_ITERATIONS,cipher:'AES-256-GCM',salt:base64(salt),iv:base64(iv),ciphertext:base64(ciphertext)})}finally{password.fill(0);plaintext.fill(0)}
}
export async function decryptWorkspaceBackup(text,account,passphrase,{crypto=globalThis.crypto}={}){
 cryptoAPI(crypto);if(typeof text!=='string'||encoder.encode(text).length>BACKUP_ENVELOPE_MAX)throw Error('Encrypted backup exceeds 6 MiB');let value;try{value=JSON.parse(text)}catch{throw Error('Invalid encrypted backup JSON')}
 if(!value||Array.isArray(value)||Object.keys(value).sort().join(',')!==['format','schema','kdf','iterations','cipher','salt','iv','ciphertext'].sort().join(',')||value.format!==FORMAT||value.schema!==1||value.kdf!=='PBKDF2-SHA256'||value.iterations!==BACKUP_KDF_ITERATIONS||value.cipher!=='AES-256-GCM')throw Error('Unsupported encrypted backup format or parameters');
 const salt=unbase64(value.salt,16),iv=unbase64(value.iv,12),ciphertext=unbase64(value.ciphertext,BACKUP_PLAINTEXT_MAX+16);if(salt.length!==16||iv.length!==12||ciphertext.length<16)throw Error('Invalid encrypted backup lengths');
 const password=passwordBytes(passphrase);let plaintext;try{const derived=await key(crypto,password,salt);try{plaintext=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:aad,tagLength:128},derived,ciphertext))}catch{throw Error('Cannot decrypt backup: wrong passphrase or damaged/tampered file')}
 const backup=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(plaintext));validateWorkspaceBackup(backup,account);return backup;
 }finally{password.fill(0);plaintext?.fill(0)}
}
