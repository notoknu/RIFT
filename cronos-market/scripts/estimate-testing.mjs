import {network} from 'hardhat';import fs from 'node:fs';
const c=await network.create('default');const {ethers}=c;const [seller,buyer]=await ethers.getSigners();const rows=[];
async function record(name,tx){const r=await(await tx).wait();rows.push({name,gas:r.gasUsed.toString()});}
const market=await(await ethers.getContractFactory('RiftMarket')).deploy(seller.address);await record('Deploy marketplace',market.deploymentTransaction());
const nft=await(await ethers.getContractFactory('RiftNFT')).deploy();await record('Deploy disposable test NFT',nft.deploymentTransaction());
await record('Mint test token',nft.mint('data:application/json,%7B%22name%22%3A%22RIFT%20test%22%7D'));
await record('Approve one token',nft.approve(await market.getAddress(),0));
await record('List once',market.list(await nft.getAddress(),0,1));
await record('Buy once (second local actor)',market.connect(buyer).buy(0,{value:1}));
await record('Withdraw seller proceeds',market.withdraw());
const total=rows.reduce((n,r)=>n+BigInt(r.gas),0n);let rpc;
for(const url of ['https://evm.cronos.org','https://cronos-evm-rpc.publicnode.com']){try{const p=new ethers.JsonRpcProvider(url,25,{staticNetwork:true});const chain=await p.send('eth_chainId',[]);if(chain!=='0x19')throw Error('Wrong chain');const price=await p.send('eth_gasPrice',[]);rpc={url,gasPriceWei:BigInt(price).toString(),gasPriceGwei:ethers.formatUnits(price,9)};p.destroy();break;}catch{}}
const report={scope:'Local EVM gas measurements, not exact mainnet quote. No paid transactions. Marketplace + disposable NFT + one complete sale cycle only; excludes exchange/drop deployment.',rows,totalGas:total.toString(),rpc,estimatedCRO:rpc?ethers.formatEther(total*BigInt(rpc.gasPriceWei)):null,budgetWith50PercentBufferCRO:rpc?ethers.formatEther(total*BigInt(rpc.gasPriceWei)*150n/100n):null};
fs.writeFileSync('checks/testing-gas-estimate.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await c.close();
