import {isAddress} from 'ethers';
const HASH=/^0x[0-9a-f]{64}$/i;
const STATUSES=new Set(['awaiting-wallet','submission-unknown','wallet-rejected','not-submitted','submitted','submitted-uncertain','confirmed','reverted','cancelled','replaced-different','reorg-uncertain']);
const safeInt=value=>Number.isSafeInteger(value)&&value>=0;
const iso=value=>typeof value==='string'&&value.length<=40&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;

// Allowlisted diagnostic export only: intentionally no import/replay facility.
export function transactionReport(wallet,{storage=globalThis.localStorage,now=Date.now()}={}) {
 if(!isAddress(wallet))throw Error('Select a valid wallet before exporting its transaction report');
 if(!Number.isSafeInteger(now)||now<0||now>8640000000000000)throw Error('Invalid report time');
 let raw,records;
 try{raw=storage.getItem('rift:transactions:v1')||'[]';if(typeof raw!=='string'||raw.length>524288)throw Error();records=JSON.parse(raw);if(!Array.isArray(records))throw Error();}
 catch{throw Error('Transaction journal unavailable, malformed or oversized; no report exported');}
 wallet=wallet.toLowerCase();
 const items=records.slice(0,50).filter(record=>record&&record.chainId===25&&typeof record.wallet==='string'&&record.wallet.toLowerCase()===wallet).map(record=>{
  const item={status:STATUSES.has(record.status)?record.status:'unrecognized',createdAt:iso(record.createdAt)};
  if(typeof record.action==='string')item.action=record.action.slice(0,80);
  for(const key of ['hash','replacedHash','blockHash'])if(typeof record[key]==='string'&&HASH.test(record[key]))item[key]=record[key].toLowerCase();
  for(const key of ['nonce','blockNumber','startBlock','checkedAt'])if(safeInt(record[key]))item[key]=record[key];
  if(isAddress(record.contractAddress||''))item.contractAddress=record.contractAddress.toLowerCase();
  return item;
 });
 return {format:'rift-transaction-report',schemaVersion:1,chainId:25,wallet,exportedAt:new Date(now).toISOString(),recordCount:items.length,
  verification:'Unverified observations from this browser-origin journal. Export performs no RPC lookup, signature or broadcast. Recorded confirmation is not finality.',
  privacy:'Plaintext: contains wallet identity, transaction history and action labels. Share only with trusted recipients. Raw context, calldata, recovery notes and arbitrary stored fields are excluded.',
  recovery:'Not a wallet backup or importable state. Hashless/legacy outcomes require manual wallet/explorer investigation. Never blindly repeat an uncertain value action.',items};
}
