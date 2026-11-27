export class ReceiptValidationError extends Error{constructor(message){super(message);this.name='ReceiptValidationError';this.code='RECEIPT_RESPONSE_INVALID'}}
const hash=v=>typeof v==='string'&&/^0x[\da-f]{64}$/i.test(v);
const sameHash=(value,expected)=>hash(value)&&hash(expected)&&value.toLowerCase()===expected.toLowerCase();
const hex=n=>'0x'+Number(n).toString(16);
const address=v=>typeof v==='string'&&/^0x[\da-f]{40}$/i.test(v);
const integer=v=>{if(typeof v!=='string'||!/^0x(?:0|[1-9a-f][0-9a-f]*)$/i.test(v))throw new ReceiptValidationError('Invalid receipt quantity');const n=Number(BigInt(v));if(!Number.isSafeInteger(n)||n<0)throw new ReceiptValidationError('Unsafe receipt quantity');return n};
function transactions(block){if(!block||!hash(block.hash)||!Array.isArray(block.transactions)||block.transactions.length>20000||block.transactions.some(t=>!hash(t)))throw new ReceiptValidationError('Invalid receipt-scan block');const tx=block.transactions.map(t=>t.toLowerCase());if(new Set(tx).size!==tx.length)throw new ReceiptValidationError('Duplicate receipt-scan transaction');return tx}
function sameBlock(block,scan){const tx=transactions(block);if(integer(block.number)!==scan.block||block.hash.toLowerCase()!==scan.hash.toLowerCase()||tx.length!==scan.transactions.length||tx.some((t,i)=>t!==scan.transactions[i].toLowerCase()))throw new ReceiptValidationError('Receipt-scan block/list changed')}
export async function beginReceiptScan(rpc,blockNumber){
 if(!Number.isSafeInteger(blockNumber)||blockNumber<0)throw new ReceiptValidationError('Invalid scan block');const block=await rpc('eth_getBlockByNumber',[hex(blockNumber),false]),tx=transactions(block);if(integer(block.number)!==blockNumber)throw new ReceiptValidationError('Wrong receipt-scan block');return {block:blockNumber,hash:block.hash.toLowerCase(),transactions:tx,cursor:0,nextLogIndex:0,observedLogBytes:0};
}
/** Finite all-log validation before filtering. Callers persist slice.scan with
 * staged logs/cursor in their existing transaction; checkpoint only after done. */
export async function receiptSlice(rpc,scan,{address:target,topics,limit=4}={}){
 if(!address(target)||!Array.isArray(topics)||topics.length<1||topics.length>32||!topics.every(hash)||!Number.isInteger(limit)||limit<1||limit>8||!Number.isSafeInteger(scan?.block)||scan.block<0||!hash(scan.hash)||!Array.isArray(scan.transactions)||scan.transactions.length>20000||scan.transactions.some(t=>!hash(t))||new Set(scan.transactions.map(t=>t.toLowerCase())).size!==scan.transactions.length||!Number.isInteger(scan.cursor)||scan.cursor<0||scan.cursor>scan.transactions.length)throw new ReceiptValidationError('Invalid receipt-scan request');
 sameBlock(await rpc('eth_getBlockByNumber',[hex(scan.block),false]),scan);const logs=[],end=Math.min(scan.transactions.length,scan.cursor+limit),allowed=new Set(topics.map(t=>t.toLowerCase()));let next=scan.nextLogIndex??(scan.cursor===0?0:null),bytes=scan.observedLogBytes??0,observed=0;
 if((next!==null&&(!Number.isSafeInteger(next)||next<0||next>20000))||!Number.isSafeInteger(bytes)||bytes<0||bytes>8388608)throw new ReceiptValidationError('Invalid receipt-scan progress');
 for(let i=scan.cursor;i<end;i++){
  const tx=scan.transactions[i].toLowerCase(),receipt=await rpc('eth_getTransactionReceipt',[tx]);
  if(!receipt||!sameHash(receipt.transactionHash,tx)||!sameHash(receipt.blockHash,scan.hash)||integer(receipt.blockNumber)!==scan.block||integer(receipt.transactionIndex)!==i||!Array.isArray(receipt.logs)||receipt.logs.length>8192)throw new ReceiptValidationError('Invalid canonical receipt');const status=integer(receipt.status);if(status>1||(status===0&&receipt.logs.length))throw new ReceiptValidationError('Invalid failed receipt logs');
  for(const log of receipt.logs){
   if(!log||log.removed||!address(log.address)||!sameHash(log.blockHash,scan.hash)||integer(log.blockNumber)!==scan.block||!sameHash(log.transactionHash,tx)||integer(log.transactionIndex)!==i||!Array.isArray(log.topics)||log.topics.length>4||!log.topics.every(hash)||typeof log.data!=='string'||!/^0x(?:[0-9a-f]{2})*$/i.test(log.data)||log.data.length>16386)throw new ReceiptValidationError('Invalid receipt log');
   const index=integer(log.logIndex);if(index>=20000||(next!==null&&index!==next)||++observed>8192)throw new ReceiptValidationError('Receipt log index/count conflict');next=index+1;bytes+=(log.data.length-2)/2+log.topics.length*32;if(bytes>8388608)throw new ReceiptValidationError('Receipt log byte limit');
   if(log.address.toLowerCase()===target.toLowerCase()&&allowed.has(log.topics[0]?.toLowerCase()))logs.push({...log,address:log.address.toLowerCase(),blockHash:log.blockHash.toLowerCase(),transactionHash:tx,topics:log.topics.map(t=>t.toLowerCase()),data:log.data.toLowerCase()});
  }
 }
 sameBlock(await rpc('eth_getBlockByNumber',[hex(scan.block),false]),scan);return {logs,cursor:end,done:end===scan.transactions.length,nextLogIndex:next,scan:{...scan,cursor:end,nextLogIndex:next,observedLogBytes:bytes}};
}
