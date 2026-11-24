import {Interface,isAddress,keccak256} from 'ethers';
const abi=new Interface(['event DropCreated(address indexed drop,address indexed creator,uint8 mode,uint256 supply,uint256 templateVersion)','function originalCreator() view returns(address)','function contractURI() view returns(string)','function name() view returns(string)']);
export async function verifyFactoryDeployment({rpc,readMetadata,factory,runtimeHash},transactionHash,wallet){
 if(!isAddress(factory)||!/^0x[\da-f]{64}$/i.test(runtimeHash||''))throw Error('Reviewed factory identity required');factory=factory.toLowerCase();wallet=wallet.toLowerCase();
 const code=await rpc('eth_getCode',[factory,'latest']);if(code==='0x'||keccak256(code)!==runtimeHash.toLowerCase())throw Error('Factory bytecode identity mismatch');
 const receipt=await rpc('eth_getTransactionReceipt',[transactionHash]);if(!receipt||BigInt(receipt.status)!==1n)throw Error('Successful receipt required');
 const block=Number(BigInt(receipt.blockNumber)),head=Number(BigInt(await rpc('eth_blockNumber',[])));if(head-block+1<12)throw Error('Wait for 12 confirmations before registration');
 if((await rpc('eth_getBlockByNumber',[receipt.blockNumber,false]))?.hash!==receipt.blockHash)throw Error('Deployment receipt is not canonical');
 const events=receipt.logs.filter(l=>l.address.toLowerCase()===factory).map(l=>{try{return abi.parseLog(l)}catch{return null}}).filter(e=>e?.name==='DropCreated'&&e.args.creator.toLowerCase()===wallet);
 if(events.length!==1||Number(events[0].args.templateVersion)!==1)throw Error('One supported creator factory event required');
 const address=events[0].args.drop.toLowerCase();
 const call=async name=>{const result=await rpc('eth_call',[{to:address,data:abi.encodeFunctionData(name)},'latest']);if(result.length>2200000)throw Error('Contract response too large');return abi.decodeFunctionResult(name,result)[0]};
 if((await call('originalCreator')).toLowerCase()!==wallet)throw Error('Creator mismatch');
 const [contractURI,name]=await Promise.all([call('contractURI'),call('name')]);if(contractURI.length>1048576)throw Error('Collection metadata too large');
 const metadata=await readMetadata(contractURI),media=v=>typeof v==='string'&&v.length<=20000&&/^(ipfs:\/\/|https:\/\/|data:image\/(?:svg\+xml|png|webp|jpeg);base64,)/.test(v)?v:'';
 return {address,factory,block,name:String(name).slice(0,100),contractURI:contractURI.length<=512?contractURI:'onchain:data',image:media(metadata.image),banner:media(metadata.banner_image),description:typeof metadata.description==='string'?metadata.description.slice(0,2000):''};
}
