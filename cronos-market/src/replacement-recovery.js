import {keccak256,isAddress} from 'ethers';
export function transactionShape(tx){try{if(!tx||!(tx.to===null||isAddress(tx.to))||typeof tx.data!=='string'||!/^0x(?:[0-9a-f]{2})*$/i.test(tx.data)||tx.value===undefined)return null;const amount=BigInt(tx.value);if(amount<0n||amount>=2n**256n)return null;return {to:tx.to?.toLowerCase()||null,dataHash:keccak256(tx.data),value:String(amount)}}catch{return null}}
export function sameTransaction(record,tx){const shape=transactionShape(tx);return !!(record.shape&&shape&&isAddress(tx.from)&&tx.from.toLowerCase()===record.wallet&&Number.isSafeInteger(record.nonce)&&tx.nonce===record.nonce&&(tx.chainId===undefined||Number(tx.chainId)===25)&&shape.to===record.shape.to&&shape.dataHash===record.shape.dataHash&&shape.value===record.shape.value)}

class Exhausted extends Error{}
/** Opt-in/manual, read-only EOA nonce recovery. Binary search uses historical
 * account nonces, not unbounded block scans. Each RPC spends a shared budget. */
export async function recoverReplacement(provider,record,budget){
 if(!Number.isSafeInteger(record.nonce)||record.nonce<0||!Number.isSafeInteger(record.startBlock)||record.startBlock<0||!isAddress(record.wallet)||!provider.getTransactionCount||!provider.getBlock||!provider.getBlockNumber)return null;
 const ask=async(method,...args)=>{if(budget.remaining<=0)throw new Exhausted();budget.remaining--;return provider[method](...args)};
 try{
  const head=await ask('getBlockNumber'),latest=await ask('getTransactionCount',record.wallet,'latest');if(!Number.isSafeInteger(head)||!Number.isSafeInteger(latest)||head<record.startBlock||latest<=record.nonce)return null;
  let search=record.nonceSearch;if(!search||![search.lo,search.hi].every(Number.isSafeInteger)||search.lo<Math.max(0,record.startBlock-1)||search.hi>head||search.hi<=search.lo){search={lo:Math.max(0,record.startBlock-1),hi:head,verified:false};record.nonceSearch=search}
  if(!search.verified){const atStart=await ask('getTransactionCount',record.wallet,search.lo);if(atStart>record.nonce){record.recoveryNote='Nonce already used before the saved start block; manual explorer investigation required';return null}search.verified=true}
  while(search.hi-search.lo>1){const mid=Math.floor((search.lo+search.hi)/2),count=await ask('getTransactionCount',record.wallet,mid);if(!Number.isSafeInteger(count)||count<0)throw Error('Invalid nonce history');if(count>record.nonce)search.hi=mid;else search.lo=mid}
  if(budget.remaining<2)return null;const block=await ask('getBlock',search.hi,true);let transactions;try{transactions=block?.prefetchedTransactions}catch{}if(!transactions&&Array.isArray(block?.transactions)&&block.transactions.every(t=>typeof t==='object'))transactions=block.transactions;if(!transactions){record.recoveryNote='RPC did not provide full block transactions; manual explorer investigation required';return null}
  const matches=transactions.filter(tx=>tx.from?.toLowerCase()===record.wallet.toLowerCase()&&Number(tx.nonce)===record.nonce);if(matches.length!==1){delete record.nonceSearch;record.recoveryNote='Canonical nonce block did not contain one matching transaction; check RPC/archive support';return null}
  const transaction=matches[0];if(!/^0x[\da-f]{64}$/i.test(transaction.hash))throw Error('Invalid replacement hash');const receipt=await ask('getTransactionReceipt',transaction.hash);if(!receipt||!/^0x[\da-f]{64}$/i.test(receipt.blockHash||'')||receipt.blockHash!==block.hash||receipt.blockNumber!==search.hi||(receipt.hash||receipt.transactionHash)?.toLowerCase()!==transaction.hash.toLowerCase()||receipt.from?.toLowerCase()!==record.wallet.toLowerCase()||![0,1].includes(receipt.status)){delete record.nonceSearch;return null}
  const shape=transactionShape(transaction),same=sameTransaction(record,transaction),cancelled=shape?.to===record.wallet.toLowerCase()&&shape.value==='0'&&shape.dataHash===keccak256('0x');return {transaction,receipt,same:!!same,cancelled};
 }catch(e){if(e instanceof Exhausted)return null;record.recoveryNote='Historical nonce lookup failed or is unavailable; no transaction was sent';return null}
}
