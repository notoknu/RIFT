import {AbiCoder,keccak256,concat} from 'ethers';import {uint} from './exchange.js';
export const tokenLeaf=id=>keccak256(concat([keccak256(AbiCoder.defaultAbiCoder().encode(['uint256'],[uint(id)]))]));
const pair=(a,b)=>keccak256(concat(a<b?[a,b]:[b,a]));
export function tokenCriteria(input){
 if(typeof input!=='string'||input.length>800000)throw Error('Invalid token-ID input');const ids=[...new Set(input.split(/[\s,;]+/).filter(Boolean).map(id=>uint(id).toString()))];if(!ids.length||ids.length>10000)throw Error('Choose 1–10,000 distinct token IDs');
 const rows=ids.map(id=>({id,leaf:tokenLeaf(id)})).sort((a,b)=>a.leaf.localeCompare(b.leaf)),layers=[rows.map(r=>r.leaf)];while(layers.at(-1).length>1){const current=layers.at(-1),next=[];for(let i=0;i<current.length;i+=2)next.push(pair(current[i],current[i+1]||current[i]));layers.push(next)}
 const claims={};rows.forEach((row,index)=>{const proof=[];for(let level=0;level<layers.length-1;level++){proof.push(layers[level][index^1]||layers[level][index]);index=Math.floor(index/2)}claims[row.id]=proof});return {root:layers.at(-1)[0],leafType:'double-keccak256 abi.encode(uint256)',claims,scope:'Token-ID membership only; not a certification of mutable external traits'};
}
export function verifyTokenCriteria(id,proof,root){if(!Array.isArray(proof)||proof.length>64||proof.some(p=>!/^0x[\da-f]{64}$/i.test(p)))return false;return proof.reduce((hash,sibling)=>pair(hash,sibling),tokenLeaf(id))===root}
