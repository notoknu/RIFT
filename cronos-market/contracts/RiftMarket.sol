// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';
import '@openzeppelin/contracts/utils/introspection/IERC165.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/access/Ownable.sol';import '@openzeppelin/contracts/access/Ownable2Step.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
/// @notice Fixed-price ERC721 escrow. No fees, royalties, offers or auctions.
contract RiftMarket is ERC721Holder, ReentrancyGuard, Ownable2Step, Pausable {
 struct Listing {address seller; address nft; uint256 tokenId; uint256 price; bool active;}
 mapping(uint256=>Listing) public listings;
 mapping(address=>uint256) public proceeds;
 uint256 public nextId;
 address private receivingNFT;
 address private receivingFrom;
 uint256 private receivingToken;
 event Listed(uint256 indexed id,address indexed seller,address indexed nft,uint256 tokenId,uint256 price);
 event Purchased(uint256 indexed id,address indexed buyer);
 event Cancelled(uint256 indexed id);
 event Withdrawn(address indexed account,uint256 amount);
 constructor(address admin) Ownable(admin) {}
 function list(address nft,uint256 tokenId,uint256 price) external nonReentrant whenNotPaused returns(uint256 id){
  require(price>0,'Zero price');
  require(nft.code.length>0 && IERC165(nft).supportsInterface(type(IERC721).interfaceId),'Not ERC721');
  require(IERC721(nft).ownerOf(tokenId)==msg.sender,'Not owner');
  id=nextId++; listings[id]=Listing(msg.sender,nft,tokenId,price,true);
  receivingNFT=nft;receivingFrom=msg.sender;receivingToken=tokenId;
  IERC721(nft).safeTransferFrom(msg.sender,address(this),tokenId);
  receivingNFT=address(0);receivingFrom=address(0);delete receivingToken;
  require(IERC721(nft).ownerOf(tokenId)==address(this),'Escrow failed');
  emit Listed(id,msg.sender,nft,tokenId,price);
 }
 /// @dev Only the transfer initiated by list() may enter escrow safely.
 function onERC721Received(address operator,address from,uint256 tokenId,bytes memory) public view override returns(bytes4){
  require(msg.sender==receivingNFT && from==receivingFrom && tokenId==receivingToken && operator==address(this),'Unexpected NFT transfer');
  return this.onERC721Received.selector;
 }
 function buy(uint256 id) external payable nonReentrant whenNotPaused {
  Listing storage a=listings[id]; require(a.active,'Inactive');require(msg.value==a.price,'Wrong payment');require(msg.sender!=a.seller,'Own listing');
  a.active=false;proceeds[a.seller]+=msg.value;
  IERC721(a.nft).safeTransferFrom(address(this),msg.sender,a.tokenId);emit Purchased(id,msg.sender);
 }
 function cancel(uint256 id) external nonReentrant {
  Listing storage a=listings[id]; require(a.active,'Inactive');require(a.seller==msg.sender,'Not seller');a.active=false;
  IERC721(a.nft).safeTransferFrom(address(this),msg.sender,a.tokenId);emit Cancelled(id);
 }
 function withdraw() external nonReentrant {uint256 amount=proceeds[msg.sender];require(amount>0,'No proceeds');proceeds[msg.sender]=0;(bool ok,)=payable(msg.sender).call{value:amount}('');require(ok,'Payment failed');emit Withdrawn(msg.sender,amount);}
 function renounceOwnership() public view override onlyOwner {revert('Use ownership transfer');}
 function pause() external onlyOwner {_pause();}
 function unpause() external onlyOwner {_unpause();}
}
