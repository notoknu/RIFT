const DEFAULT='https://api.pinata.cloud/pinning/pinFileToIPFS';
const validToken=v=>typeof v==='string'&&/^[A-Za-z0-9._~+/=-]{1,4096}$/.test(v);
export function creatorUploadConfig(env={}){
 const driver=env.CREATOR_PIN_DRIVER||'pinata';if(!['pinata','pinata-compatible'].includes(driver))throw Error('Unsupported upload provider driver');
 if(driver==='pinata'){if(!env.PINATA_JWT)return {driver,enabled:false,label:'Pinata public IPFS'};if(!validToken(env.PINATA_JWT))throw Error('Invalid upload credential');return {driver,enabled:true,url:DEFAULT,token:env.PINATA_JWT,label:'Pinata public IPFS'}}
 let u;try{u=new URL(env.CREATOR_PIN_API_URL)}catch{throw Error('Reviewed upload endpoint required')}
 const host=env.CREATOR_PIN_APPROVED_HOST;const hostname=typeof host==='string'&&host===host.toLowerCase()&&host.length<=253&&/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)&&!['.localhost','.local','.internal','.lan','.test'].some(s=>host.endsWith(s));
 if(!hostname||u.hostname!==host||u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash||u.pathname==='/'||u.href.length>2048||!validToken(env.CREATOR_PIN_AUTH_TOKEN))throw Error('Reviewed upload endpoint and credential required');
 return {driver,enabled:true,url:u.href,token:env.CREATOR_PIN_AUTH_TOKEN,label:'Operator-configured Pinata-compatible public IPFS'};
}
