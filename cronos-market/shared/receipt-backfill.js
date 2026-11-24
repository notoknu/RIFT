const hash=value=>typeof value==='string'&&/^0x[\da-f]{64}$/i.test(value);
const hex=n=>'0x'+Number(n).toString(16);
export async function beginReceiptScan(rpc,blockNumber){
 if(!Number.isSafeInteger(blockNumber)||blockNumber<0)throw Error('Invalid scan block');const block=await rpc('eth_getBlockByNumber',[hex(blockNumber),false]);
 if(!block||!hash(block.hash)||Number(BigInt(block.number))!==blockNumber||!Array.isArray(block.transactions)||block.transactions.length>20000||block.transactions.some(tx=>!hash(tx))||new Set(block.transactions).size!==block.transactions.length)throw Error('Invalid receipt-scan block');
 return {block:blockNumber,hash:block.hash,transactions:block.transactions,cursor:0};
}
/** Bounded resumable receipt scan. Callers durably stage returned logs/cursor in
 * one transaction, and publish projections/checkpoint only after done=true. */
export async function receiptSlice(rpc,scan,{address,topics,limit=4}={}){
 if(!/^0x[\da-f]{40}$/i.test(address||'')||!Array.isArray(topics)||!Number.isInteger(limit)||limit<1||limit>8||!Number.isInteger(scan.cursor)||scan.cursor<0||scan.cursor>scan.transactions.length)throw Error('Invalid receipt-scan request');
 const canonical=await rpc('eth_getBlockByNumber',[hex(scan.block),false]);if(canonical?.hash!==scan.hash)throw Error('Receipt-scan canonical block changed');
 const logs=[],end=Math.min(scan.transactions.length,scan.cursor+limit),indices=new Set();
 for(let i=scan.cursor;i<end;i++){
  const tx=scan.transactions[i],receipt=await rpc('eth_getTransactionReceipt',[tx]);
  if(!receipt||receipt.transactionHash?.toLowerCase()!==tx.toLowerCase()||receipt.blockHash!==scan.hash||Number(BigInt(receipt.blockNumber))!==scan.block||Number(BigInt(receipt.transactionIndex))!==i||!Array.isArray(receipt.logs)||receipt.logs.length>20000)throw Error('Invalid canonical receipt');
  for(const log of receipt.logs){
   if(log.address?.toLowerCase()!==address.toLowerCase()||!topics.includes(log.topics?.[0]))continue;
   const index=Number(BigInt(log.logIndex));if(log.removed||log.blockHash!==scan.hash||Number(BigInt(log.blockNumber))!==scan.block||log.transactionHash?.toLowerCase()!==tx.toLowerCase()||!Number.isSafeInteger(index)||index<0||indices.has(index))throw Error('Invalid receipt log');indices.add(index);logs.push(log);
  }
 }
 if((await rpc('eth_getBlockByNumber',[hex(scan.block),false]))?.hash!==scan.hash)throw Error('Receipt-scan canonical block changed');
 return {logs,cursor:end,done:end===scan.transactions.length};
}
