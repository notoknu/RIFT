import{keccak256}from'ethers';import fs from'node:fs';import{artifacts}from'hardhat';
const artifact=await artifacts.readArtifact('RiftDrop'),id=await artifacts.getBuildInfoId('RiftDrop');if(!id)throw Error('Compile first');const info=JSON.parse(fs.readFileSync(await artifacts.getBuildInfoPath(id),'utf8'));fs.mkdirSync('public',{recursive:true});fs.writeFileSync('public/drop-contract.json',JSON.stringify({abi:artifact.abi,bytecode:artifact.bytecode}));fs.writeFileSync('public/drop-verification.json',JSON.stringify({contract:'project/contracts/RiftDrop.sol:RiftDrop',compiler:info.solcLongVersion,bytecodeHash:keccak256(artifact.bytecode),standardInput:info.input}));console.log('Exported matching Hardhat 3 ABI, bytecode and Standard JSON input.');

const factoryArtifact=await artifacts.readArtifact('RiftDropFactory');fs.writeFileSync('public/drop-factory.json',JSON.stringify({abi:factoryArtifact.abi,bytecode:factoryArtifact.bytecode}));console.log('Exported undeployed factory artifact.');

// Separate artifact only: does NOT select, deploy, or enable exchange trading.
const exchangeArtifact=await artifacts.readArtifact('RiftExchange'),exchangeBuildId=await artifacts.getBuildInfoId('RiftExchange');
if(!exchangeBuildId)throw Error('Compile exchange first');const exchangeBuild=JSON.parse(fs.readFileSync(await artifacts.getBuildInfoPath(exchangeBuildId),'utf8'));
fs.writeFileSync('public/exchange-contract.json',JSON.stringify({contract:'RiftExchange',chainId:25,reviewed:false,abi:exchangeArtifact.abi,bytecode:exchangeArtifact.bytecode,runtimeHash:keccak256(exchangeArtifact.deployedBytecode)}));
fs.writeFileSync('public/exchange-verification.json',JSON.stringify({contract:'project/contracts/RiftExchange.sol:RiftExchange',reviewed:false,compiler:exchangeBuild.solcLongVersion,creationHash:keccak256(exchangeArtifact.bytecode),runtimeHash:keccak256(exchangeArtifact.deployedBytecode),standardInput:exchangeBuild.input}));
console.log('Exported separate UNREVIEWED exchange ABI/verification artifact; no deployment or trading activation.');
