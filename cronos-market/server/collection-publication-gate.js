import {verifyPublicationHeaders} from './chain-publication-gate.js';
import {verifyPublicationEvents} from './chain-event-quorum.js';
import {boundedExchangeRpc} from './platform-exchange-rpc.js';
import {ChainReadError} from './chain-read-quorum.js';
export async function verifyCollectionPublication({provider,chainReader,eventReader,address,topics,fromBlock,toBlock,ancestor,startBlock,logs,expectedEndHash,signal,timeoutMs=15000}){
 const rpc=boundedExchangeRpc(provider,{signal,timeoutMs:Math.min(timeoutMs,60000),maxCalls:40});
 if(toBlock-fromBlock>=32)throw new ChainReadError('COLLECTION_AGREEMENT_RANGE_LIMIT');
 const headers=[];for(let n=ancestor>=startBlock?ancestor:fromBlock;n<=toBlock;n++)headers.push(await rpc.getBlock(n));
 if(headers.at(-1)?.hash?.toLowerCase()!==expectedEndHash?.toLowerCase())throw new ChainReadError('COLLECTION_CHAIN_CHANGED');
 const chainAgreement=await verifyPublicationHeaders({reader:chainReader,headers,signal,timeoutMs});
 const eventAgreement=await verifyPublicationEvents({reader:eventReader,query:{address,fromBlock,toBlock,topics:[topics]},logs:logs.map(l=>({...l,blockNumber:Number(BigInt(l.blockNumber)),index:l.index??Number(BigInt(l.logIndex))})),endHash:expectedEndHash,signal,timeoutMs});
 rpc.check();return {chainAgreement,eventAgreement};
}
