import{expect}from'chai';import{network}from'hardhat';const{ethers}=await network.create();
describe('Drop factory registry',()=>{
 it('registers creator deployments, keeps creator ownership and rejects spoofed creators',async()=>{
  const [creator,other]=await ethers.getSigners(),f=await ethers.deployContract('RiftDropFactory');
  const cfg={name:'Creator Original',symbol:'ART',supply:2,walletLimit:2,txLimit:2,price:0,start:0,end:0,allowlistEnd:0,root:ethers.ZeroHash,mode:0,content:'',creator:creator.address,royaltyBps:0,description:'',collectionImage:'',collectionBanner:'',externalUrl:''};
  const receipt=await(await f.create(cfg)).wait(),event=receipt.logs.map(l=>{try{return f.interface.parseLog(l)}catch{return null}}).find(e=>e?.name==='DropCreated');
  const drop=await ethers.getContractAt('RiftDrop',event.args.drop);
  expect(await drop.owner()).eq(creator.address);expect(await f.creatorOf(event.args.drop)).eq(creator.address);
  await drop.connect(other).mint(1,[]);expect(await drop.ownerOf(1)).eq(other.address);
  await expect(f.connect(other).create(cfg)).revertedWith('Creator must be sender');
 });
});

describe('Creator backend chain verification',()=>{
 it('validates EIP-1271 against an actual local contract wallet',async()=>{
  const {verifyContractWallet}=await import('../server/creator-chain.js');const [a,b]=await ethers.getSigners(),wallet=await ethers.deployContract('CreatorWallet',[a.address]),message='RIFT isolated local sign-in test',hash=ethers.hashMessage(message);
  expect(await verifyContractWallet(ethers.provider,await wallet.getAddress(),hash,await a.signMessage(message))).eq(true);
  expect(await verifyContractWallet(ethers.provider,await wallet.getAddress(),hash,await b.signMessage(message))).eq(false);
  expect(await verifyContractWallet(ethers.provider,a.address,hash,await a.signMessage(message))).eq(false);
 });
 it('registers only a confirmed canonical event from the reviewed factory runtime',async()=>{
  const {verifyFactoryDeployment}=await import('../shared/verify-factory.js');const [creator,other]=await ethers.getSigners(),factory=await ethers.deployContract('RiftDropFactory'),address=await factory.getAddress(),runtimeHash=ethers.keccak256(await ethers.provider.getCode(address));
  const config={name:'Local registry proof',symbol:'PRF',supply:1,walletLimit:1,txLimit:1,price:0,start:0,end:0,allowlistEnd:0,root:ethers.ZeroHash,mode:0,content:'',creator:creator.address,royaltyBps:0,description:'',externalUrl:'',collectionImage:'',collectionBanner:''};
  const tx=await factory.create(config);await tx.wait();const options={rpc:(method,params)=>ethers.provider.send(method,params),factory:address,runtimeHash,readMetadata:async uri=>JSON.parse(Buffer.from(uri.split(',')[1],'base64').toString())};
  let premature=false;try{await verifyFactoryDeployment(options,tx.hash,creator.address)}catch(e){premature=e.message.includes('12 confirmations')}expect(premature).eq(true);
  await ethers.provider.send('hardhat_mine',['0xc']);const record=await verifyFactoryDeployment(options,tx.hash,creator.address);expect(record.name).eq(config.name);expect(record.factory).eq(address.toLowerCase());
  let rejected=false;try{await verifyFactoryDeployment({...options,runtimeHash:ethers.ZeroHash},tx.hash,creator.address)}catch{rejected=true}expect(rejected).eq(true);
  rejected=false;try{await verifyFactoryDeployment(options,tx.hash,other.address)}catch{rejected=true}expect(rejected).eq(true);
 });
});
