import {isAddress} from 'ethers';
import {exchangeInterface,EXCHANGE_EVENTS} from '../shared/exchange.js';
export class ReceiptScanError extends Error{constructor(code){super(code);this.name='ReceiptScanError';this.code=code;}}
const demand=(ok,code)=>{if(!ok)throw new ReceiptScanError(code)};
const HASH=/^0x[\da-f]{64}$/i;
const safe=n=>Number.isSafeInteger(n)&&n>=0;
const topics=new Set(EXCHANGE_EVENTS.map(name=>exchangeInterface.getEvent(name).topicHash.toLowerCase()));
/** Bounded read-only enumeration. Trusts provider block transaction lists and receipt contents; no trie proof. */
export async function acquireExchangeReceipts(provider,{address,fromBlock,toBlock}){
 demand(isAddress(address)&&safe(fromBlock)&&safe(toBlock)&&toBlock>=fromBlock&&toBlock-fromBlock<32,'INVALID_RECEIPT_RANGE');
 const logs=[],headers=new Map(),seenTx=new Set();let totalTransactions=0,totalLogs=0,bytes=0;
 for(let number=fromBlock;number<=toBlock;number++){
  const block=await provider.getBlock(number);
  demand(block&&block.number===number&&HASH.test(block.hash||'')&&Array.isArray(block.transactions),'INVALID_RECEIPT_BLOCK');
  demand(block.transactions.length<=256-totalTransactions,'RECEIPT_TRANSACTION_LIMIT');
  const blockHash=block.hash.toLowerCase(),transactions=[...block.transactions];
  totalTransactions+=transactions.length;demand(totalTransactions<=256,'RECEIPT_TRANSACTION_LIMIT');
  headers.set(number,blockHash);
  for(const tx of transactions){demand(typeof tx==='string'&&HASH.test(tx)&&!seenTx.has(tx.toLowerCase()),'INVALID_BLOCK_TRANSACTIONS');seenTx.add(tx.toLowerCase())}
  // Process at most four receipts concurrently, preserving canonical transaction order.
  let cursor=0;const receipts=new Array(transactions.length);
  const results=await Promise.allSettled(Array.from({length:Math.min(4,transactions.length)},async()=>{while(cursor<transactions.length){const index=cursor++;const receipt=await provider.getTransactionReceipt(transactions[index]);
   demand(receipt&&receipt.hash?.toLowerCase()===transactions[index].toLowerCase()&&receipt.blockNumber===number&&receipt.blockHash?.toLowerCase()===blockHash&&receipt.index===index&&(receipt.status===0||receipt.status===1)&&Array.isArray(receipt.logs),'INVALID_TRANSACTION_RECEIPT');
   totalLogs+=receipt.logs.length;demand(totalLogs<=8192,'RECEIPT_LOG_LIMIT');
   demand(receipt.status!==0||receipt.logs.length===0,'FAILED_RECEIPT_HAS_LOGS');
   receipts[index]=receipt.logs.map(log=>{demand(log&&Array.isArray(log.topics)&&log.topics.length<=4,'INVALID_RECEIPT_LOG_ENCODING');return ({address:log?.address,blockNumber:log?.blockNumber,index:log?.index,blockHash:log?.blockHash,transactionHash:log?.transactionHash,transactionIndex:log?.transactionIndex,removed:log?.removed,data:log?.data,topics:[...log.topics]})});
  }}));
  const failure=results.find(result=>result.status==='rejected');if(failure)throw failure.reason;
  let nextLog=0;
  for(let index=0;index<receipts.length;index++)for(const log of receipts[index]){
   demand(log&&!log.removed&&isAddress(log.address||'')&&log.blockNumber===number&&log.blockHash?.toLowerCase()===blockHash&&log.transactionHash?.toLowerCase()===transactions[index].toLowerCase()&&log.transactionIndex===index&&log.index===nextLog++,'INVALID_RECEIPT_LOG_POSITION');
   demand(typeof log.data==='string'&&/^0x(?:[a-f0-9]{2})*$/i.test(log.data)&&log.data.length<=16386&&Array.isArray(log.topics)&&log.topics.length<=4&&log.topics.every(topic=>HASH.test(topic)),'INVALID_RECEIPT_LOG_ENCODING');
   bytes+=log.data.length/2+log.topics.length*32;demand(bytes<=2097152,'RECEIPT_BYTES_LIMIT');
   if(log.address.toLowerCase()===address.toLowerCase()&&topics.has(log.topics[0]?.toLowerCase())){logs.push(log);demand(logs.length<=512,'RECEIPT_EXCHANGE_EVENT_LIMIT')}
  }
 }
 return {logs,headers,transactionCount:totalTransactions,observedLogCount:totalLogs,scope:'Enumerated receipts for every transaction advertised by one RPC; no independent transaction/receipt trie or consensus proof'};
}
