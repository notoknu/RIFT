import {validateIPFS} from './metadata.js';
export function profileDocument(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Profile object required');
 const fields=['version','displayName','bio','website','avatar'];
 if(Object.keys(value).some(k=>!fields.includes(k)))throw Error('Unsupported profile field; credentials and wallet identity cannot be stored');
 if(!Number.isSafeInteger(value.version)||value.version<0||value.version>1000000000)throw Error('Valid profile version required');
 const bounded=(name,max)=>{const s=value[name]??'';if(typeof s!=='string'||s.length>max||/[\u0000-\u0008\u000b-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(s))throw Error('Invalid profile '+name);return s.normalize('NFC').trim()};
 const displayName=bounded('displayName',48),bio=bounded('bio',500),website=bounded('website',300),avatar=bounded('avatar',512);
 if(/[<>\r\n\t]/.test(displayName))throw Error('Display name must be plain single-line text');
 if(website){const u=new URL(website);if(u.protocol!=='https:'||u.username||u.password)throw Error('Website must be credential-free HTTPS');}
 if(avatar)validateIPFS(avatar);
 return {version:value.version,document:JSON.stringify({displayName,bio,website,avatar})};
}
