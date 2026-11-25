import {Contract,formatEther,isAddress} from 'ethers';

export async function prepareMintReview({signer,address,abi,quantity,proof,contractFactory=(a,b,s)=>new Contract(a,b,s)}) {
  if(!isAddress(address))throw Error('Invalid mint contract');
  if(!/^[1-9][0-9]{0,5}$/.test(String(quantity)))throw Error('Invalid mint quantity');
  const count=BigInt(quantity);
  if(!Array.isArray(proof)||proof.length>64||proof.some(value=>typeof value!=='string'||!/^0x[0-9a-f]{64}$/i.test(value)))throw Error('Invalid or oversized allowlist proof');
  if(Number((await signer.provider.getNetwork()).chainId)!==25)throw Error('Mint requires Cronos chain 25');
  const wallet=await signer.getAddress();if(!isAddress(wallet))throw Error('Invalid mint wallet');
  if(await signer.provider.getCode(address)==='0x')throw Error('Mint contract has no code');
  const contract=contractFactory(address,abi,signer);
  const [paused,start,end,total,max,limit,txLimit,minted,price]=await Promise.all([
    contract.paused(),contract.start(),contract.end(),contract.totalMinted(),contract.maxSupply(),contract.walletLimit(),contract.txLimit(),contract.mintedBy(wallet),contract.mintPrice(),
  ]);
  const head=await signer.provider.getBlock('latest');
  if(!Number.isSafeInteger(head?.timestamp)||head.timestamp<0)throw Error('Chain timestamp unavailable; retry explicitly');
  const time=BigInt(head.timestamp);
  if(paused)throw Error('Mint is paused');
  if(time<BigInt(start)||(BigInt(end)!==0n&&time>=BigInt(end)))throw Error('Mint is not live');
  if(count>BigInt(txLimit))throw Error('Mint exceeds transaction limit');
  if(BigInt(total)+count>BigInt(max))throw Error('Insufficient remaining collection supply');
  if(BigInt(minted)+count>BigInt(limit))throw Error('Mint exceeds remaining wallet allowance');
  const value=BigInt(price)*count;if(value<0n)throw Error('Invalid mint price');
  const args=[count,[...proof],{value}];
  await contract.mint.staticCall(...args);
  const gas=await contract.mint.estimateGas(...args),fees=await signer.provider.getFeeData();
  const rate=fees.maxFeePerGas??fees.gasPrice;
  if(typeof gas!=='bigint'||gas<=0n||typeof rate!=='bigint'||rate<=0n)throw Error('Network fee estimate unavailable');
  const networkFee=gas*rate;
  if(await signer.provider.getBalance(wallet)<value+networkFee)throw Error('Insufficient CRO for mint price plus estimated gas');
  return {signer,contract,args,wallet,address,quantity:count,value,gas,networkFee,
    text:[
      'Mint '+count+' NFT(s) on Cronos MAINNET?',
      'Contract: '+address,
      'Wallet: '+wallet,
      'Mint price total: '+formatEther(value)+' CRO',
      'Estimated network fee: '+formatEther(networkFee)+' CRO',
      'Estimated total: '+formatEther(value+networkFee)+' CRO',
      'RIFT platform fee: 0 CRO. A zero mint price does not remove gas costs.',
      'Estimates can change. Wallet provides the final fee. Simulation is not an audit or a guarantee of success.',
    ].join('\n'),
  };
}

// Confirmation and a second simulation are explicit; never retry a value action.
export async function confirmMintReview(review,confirmAction=globalThis.confirm) {
  if(!confirmAction(review.text))throw Error('Mint review declined');
  if(Number((await review.signer.provider.getNetwork()).chainId)!==25||(await review.signer.getAddress()).toLowerCase()!==review.wallet.toLowerCase())throw Error('Mint wallet or network changed; review again');
  await review.contract.mint.staticCall(...review.args);
  return review;
}
