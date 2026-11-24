// Canonical content-reference grammar only. The actual native gateway is saved separately; this performs NO fetch or CID-content verification.
export function metadataEndpoint(value){
 if(typeof value!=='string'||value.length>1024)throw Error('Metadata URI limit exceeded');let path;
 if(value.startsWith('ipfs://')){path=value.slice(7);if(path.startsWith('ipfs/'))path=path.slice(5)}else{if(!value.startsWith('https://ipfs.io/ipfs/'))throw Error('Only IPFS references through ipfs.io can be inspected');path=value.slice(21)}
 const parts=path.split('/');if(parts.length>17||!/^(?:Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,119})$/.test(parts[0]))throw Error('Unsupported IPFS identifier');if(parts.slice(1).some(p=>!/^[A-Za-z0-9._~-]{1,120}$/.test(p)||p==='.'||p==='..'))throw Error('Unsupported IPFS path');const endpoint='https://ipfs.io/ipfs/'+path;if(endpoint.length>1024)throw Error('Normalized metadata URI exceeds limit');return endpoint;
}
