// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import '../RiftMarket.sol';
import '../RiftNFT.sol';
contract HostileReceiver is IERC721Receiver {
 RiftMarket public market;uint256 public target;bool public rejectNFT;bool public rejectPayment;bool public reentrySucceeded;
 constructor(RiftMarket m){market=m;}
 function configure(bool nft,bool payment)external{rejectNFT=nft;rejectPayment=payment;}
 function buy(uint256 id)external payable{target=id;market.buy{value:msg.value}(id);}
 function create(RiftNFT nft,uint256 price)external{uint256 id=nft.mint('ipfs://actor');nft.approve(address(market),id);market.list(address(nft),id,price);}
 function withdraw()external{market.withdraw();}
 function cancel(uint256 id)external{market.cancel(id);}
 function onERC721Received(address,address,uint256,bytes calldata)external returns(bytes4){require(!rejectNFT,'NFT rejected');(bool ok,)=address(market).call(abi.encodeCall(market.cancel,(target)));reentrySucceeded=ok;return this.onERC721Received.selector;}
 receive()external payable{require(!rejectPayment,'Payment rejected');(bool ok,)=address(market).call(abi.encodeCall(market.withdraw,()));reentrySucceeded=ok;}
}
contract LyingNFT {
 address public holder;constructor(){holder=msg.sender;}
 function supportsInterface(bytes4)external pure returns(bool){return true;}
 function ownerOf(uint256)external view returns(address){return holder;}
 function safeTransferFrom(address,address,uint256)external{} // claims ERC721 but never transfers
}
