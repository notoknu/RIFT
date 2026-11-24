// READ ONLY: no wallet loading, signing, sending or security-gate override.
import {JsonRpcProvider,ContractFactory,formatEther,formatUnits,keccak256} from 'ethers';
import {readFile,writeFile} from 'node:fs/promises';
const address='0x49E3c82Ee961635658b9C5590aa0147B693fA331';
const rpc=process.env.CRONOS_RPC_URL||'https://evm.cronos.org';
const p=new JsonRpcProvider(rpc,25,{staticNetwork:true});
try {
 const chainId=await p.send('eth_chainId',[]);if(BigInt(chainId)!==25n)throw Error('Wrong chain');
 const [balance,nonce,gasPrice]=await Promise.all([p.getBalance(address),p.getTransactionCount(address),p.send('eth_gasPrice',[]).then(BigInt)]);
 const deployments=[];
 for(const [name,args] of [['RiftMarket',[address]],['RiftNFT',[]]]){
  const a=JSON.parse(await readFile(`artifacts/contracts/${name}.sol/${name}.json`,'utf8'));
  const tx=await new ContractFactory(a.abi,a.bytecode).getDeployTransaction(...args);
  const gas=await p.estimateGas({...tx,from:address});
  deployments.push({contract:name,bytecodeHash:keccak256(a.bytecode),estimatedGas:gas.toString(),estimatedCRO:formatEther(gas*gasPrice)});
 }
 const report={checkedAt:new Date().toISOString(),mode:'READ ONLY — no transaction sent',chainId:25,address,balanceCRO:formatEther(balance),nonce,gasPriceGwei:formatUnits(gasPrice,9),deployments,securityReviewApproved:false,publicTradingActivationApproved:false,note:'Deployment gas only; lifecycle gas measured separately on local EVM. Funds do not constitute security review. Re-estimate immediately before any separately approved transaction.'};
 await writeFile('checks/mainnet-testing-preflight.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
} finally {p.destroy();}
