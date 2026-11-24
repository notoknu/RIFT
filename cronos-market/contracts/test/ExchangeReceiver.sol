// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import '@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol';
interface IExchangeTest {function buy(uint256,uint256)external payable;function withdrawTo(address payable)external;function cancelListing(uint256)external;function makeOffer(address,uint256,uint256,uint256,uint64,uint8,bytes32,bool)external payable returns(uint256);function closeOffer(uint256)external;}
contract ExchangeReceiver is ERC1155Holder {
 IExchangeTest public exchange;bool public rejectNFT;bool public rejectPayment;bool public attempted;bool public reentrySucceeded;
 constructor(address target){exchange=IExchangeTest(target);}
 function configure(bool nft,bool payment)external{rejectNFT=nft;rejectPayment=payment;}
 function buy(uint256 id,uint256 quantity)external payable{exchange.buy{value:msg.value}(id,quantity);}
 function offer(address nft,uint64 expiry)external payable{exchange.makeOffer{value:msg.value}(nft,0,msg.value,1,expiry,1,bytes32(0),true);}
 function close(uint256 id)external{exchange.closeOffer(id);}
 function withdraw()external{exchange.withdrawTo(payable(address(this)));}
 function onERC1155Received(address,address,uint256,uint256,bytes memory)public override returns(bytes4){require(!rejectNFT,'Receiver rejects NFT');attempted=true;(reentrySucceeded,)=address(exchange).call(abi.encodeCall(IExchangeTest.cancelListing,(0)));return this.onERC1155Received.selector;}
 receive()external payable{require(!rejectPayment,'Receiver rejects payment');attempted=true;(reentrySucceeded,)=address(exchange).call(abi.encodeCall(IExchangeTest.withdrawTo,(payable(address(this)))));}
}
