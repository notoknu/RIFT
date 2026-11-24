// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import './RiftDrop.sol';
/// @notice Version 1 full-contract deployments. Creator pays gas; no platform fee.
/// @dev Not a clone factory. No admin recovery, custody or authenticity certification.
contract RiftDropFactory {
 mapping(address=>address) public creatorOf;
 event DropCreated(address indexed drop,address indexed creator,uint8 mode,uint256 supply,uint256 templateVersion);
 function create(RiftDrop.Config calldata config) external returns(address drop){
  require(config.creator==msg.sender,'Creator must be sender');
  RiftDrop deployed=new RiftDrop(config);drop=address(deployed);
  creatorOf[drop]=msg.sender;
  emit DropCreated(drop,msg.sender,config.mode,config.supply,1);
 }
}
