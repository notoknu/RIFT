import {transactionShape,recoverReplacement,sameTransaction} from './replacement-recovery.js';
import {Interface,isAddress} from 'ethers';
const factoryEvents=new Interface(['event DropCreated(address indexed drop,address indexed creator,uint8 mode,uint256 supply,uint256 templateVersion)']);
function deployedAddress(receipt,record){
 if(isAddress(receipt.contractAddress))return receipt.contractAddress;
 try{const context=JSON.parse(record.context||'{}');if(!isAddress(context.factory))return null;
 const matching=(receipt.logs||[]).filter(l=>l.address?.toLowerCase()===context.factory.toLowerCase()).map(l=>{try{return factoryEvents.parseLog(l)}catch{return null}}).filter(e=>e?.name==='DropCreated'&&e.args.creator.toLowerCase()===record.wallet);
 return matching.length===1?matching[0].args.drop:null;
 }catch{return null}
}
function validateReceipt(receipt,record){
 const hash=receipt?.hash||receipt?.transactionHash,status=receipt?.status;
 if(typeof hash!=='string'||hash.toLowerCase()!==record.hash.toLowerCase()||!/^0x[0-9a-f]{64}$/i.test(receipt?.blockHash||'')||!Number.isSafeInteger(receipt?.blockNumber)||receipt.blockNumber<0||![0,1].includes(status)||!isAddress(receipt?.from)||receipt.from.toLowerCase()!==record.wallet)throw Error('Receipt identity/status/block validation failed. No dependent action was sent.');
 return status;
}
const KEY='rift:transactions:v1',UPDATE='rift:transactions-updated';
export function readTransactions(storage=globalThis.localStorage){try{const data=JSON.parse(storage.getItem(KEY)||'[]');return Array.isArray(data)?data.filter(v=>v&&v.chainId===25&&typeof v.id==='string'&&typeof v.wallet==='string').slice(0,50):[]}catch{return []}}
function persist(record,storage=globalThis.localStorage){
 const records=readTransactions(storage),result=[record,...records.filter(v=>v.id!==record.id)].slice(0,50);storage.setItem(KEY,JSON.stringify(result));if(typeof dispatchEvent==='function')dispatchEvent(new Event(UPDATE));
}
export {UPDATE as TRANSACTION_UPDATE};
/** Never re-broadcasts or re-signs automatically. Save before the first wallet prompt. */
export async function trackedTransaction(action,signer,send,context={},storage=globalThis.localStorage){
 if(Number((await signer.provider.getNetwork()).chainId)!==25)throw Error('Transaction requires Cronos chain 25');
 const wallet=(await signer.getAddress()).toLowerCase(),record={id:crypto.randomUUID(),chainId:25,wallet,action:String(action).slice(0,80),context:JSON.stringify(context).slice(0,2000),status:'awaiting-wallet',createdAt:new Date().toISOString()};
 if(!isAddress(wallet))throw Error('Invalid signer address');
 if(typeof signer.provider.getBlockNumber==='function'){try{const block=await signer.provider.getBlockNumber();if(Number.isSafeInteger(block)&&block>=0)record.startBlock=block}catch{}}
 try{persist(record,storage)}catch{throw Error('Transaction recovery storage is unavailable. No transaction was requested.')}
 let tx;
 try{
  tx=await send();if(!/^0x[\da-f]{64}$/i.test(tx.hash))throw Error('Wallet returned invalid transaction hash');record.hash=tx.hash;if(tx.from?.toLowerCase()===wallet&&Number.isSafeInteger(tx.nonce)&&tx.nonce>=0)record.nonce=tx.nonce;record.shape=transactionShape(tx);record.status='submitted';persist(record,storage);if(!isAddress(tx.from)||tx.from.toLowerCase()!==wallet||!Number.isSafeInteger(tx.nonce)||tx.nonce<0||(tx.chainId!==undefined&&Number(tx.chainId)!==25))throw Error('Wallet returned an inconsistent transaction. Verify it manually; no dependent step was sent.');
  let receipt;
  try{receipt=await tx.wait()}catch(e){
   if(e.code!=='TRANSACTION_REPLACED')throw e;
   record.replacedHash=record.hash;if(!/^0x[\da-f]{64}$/i.test(e.replacement?.hash||''))throw Error('Invalid replacement transaction hash');record.hash=e.replacement.hash;
   if(e.cancelled){record.status='cancelled';persist(record,storage);throw Error('Wallet replaced/cancelled this transaction. No dependent step was sent.')}
   if(!sameTransaction(record,e.replacement)){record.status='replaced-different';record.recoveryNote='Replacement semantics could not be verified as identical. No dependent step was sent.';persist(record,storage);throw Error(record.recoveryNote)}
   receipt=e.receipt||await e.replacement.wait();
  }
  record.status=validateReceipt(receipt,record)===1?'confirmed':'reverted';record.blockNumber=receipt.blockNumber;record.blockHash=receipt.blockHash;record.checkedAt=Date.now();record.contractAddress=record.status==='confirmed'?deployedAddress(receipt,record):null;persist(record,storage);
  if(record.status!=='confirmed')throw Error('Transaction reverted');return receipt;
 }catch(e){
  if(!['confirmed','reverted','cancelled','replaced-different'].includes(record.status)){
   if(record.hash)record.status='submitted-uncertain';
   else if(e?.code===4001||e?.code==='ACTION_REJECTED')record.status='wallet-rejected';
   else {record.status='submission-unknown';record.recoveryNote='No valid transaction hash reached RIFT. The wallet or RPC may have submitted it before the error. Inspect wallet activity and the explorer before repeating this value action. Automatic checks cannot find a hashless submission; no retry was sent.';}
  }
  try{persist(record,storage)}catch{}throw e;
 }
}
export async function reconcileTransactions(provider,wallet,storage=globalThis.localStorage){
 if(Number((await provider.getNetwork()).chainId)!==25)throw Error('Recovery requires Cronos chain 25');
 if(!isAddress(wallet))throw Error('Invalid recovery wallet');wallet=wallet.toLowerCase();
 let checked=0;const budget={remaining:24},pending=['submitted','submitted-uncertain','reorg-uncertain'];
 const records=readTransactions(storage).filter(r=>r.wallet===wallet&&/^0x[\da-f]{64}$/i.test(r.hash||'')&&[...pending,'confirmed','reverted'].includes(r.status)).sort((a,b)=>(pending.includes(a.status)?0:1)-(pending.includes(b.status)?0:1)||(a.checkedAt||0)-(b.checkedAt||0));
 for(const record of records){
  if(checked>=10||budget.remaining<=0)break;checked++;budget.remaining--;record.checkedAt=Date.now();let receipt;
  try{receipt=await provider.getTransactionReceipt(record.hash)}catch{record.recoveryNote='Receipt RPC unavailable; no transaction was sent';persist(record,storage);continue}
  if(!receipt&&['confirmed','reverted'].includes(record.status)){record.status='reorg-uncertain';delete record.contractAddress;record.recoveryNote='Previously observed receipt is missing. Possible reorganization or provider inconsistency; do not repeat the value action blindly.';persist(record,storage);continue}
  if(!receipt){const replacement=await recoverReplacement(provider,record,budget);if(!replacement){persist(record,storage);continue}record.replacedHash=record.hash;record.hash=replacement.transaction.hash;record.replacementDiscovered=true;receipt=replacement.receipt;
   if(!replacement.same){record.status=replacement.cancelled?'cancelled':'replaced-different';record.blockNumber=receipt.blockNumber;record.recoveryNote='Different transaction consumed this nonce. No dependent action was sent.';persist(record,storage);continue}
  }
  try{record.status=validateReceipt(receipt,record)===1?'confirmed':'reverted';record.blockNumber=receipt.blockNumber;record.blockHash=receipt.blockHash;record.contractAddress=record.status==='confirmed'?deployedAddress(receipt,record):null;delete record.nonceSearch;delete record.recoveryNote;}
  catch{if(['confirmed','reverted'].includes(record.status))record.status='reorg-uncertain';delete record.contractAddress;record.recoveryNote='RPC receipt identity/status/block mismatch; observation not accepted. No transaction was sent.';}
  persist(record,storage);
 }
 return readTransactions(storage).filter(r=>r.wallet===wallet);
}
