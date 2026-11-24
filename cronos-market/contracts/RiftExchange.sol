// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';
import '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import '@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol';
import '@openzeppelin/contracts/interfaces/IERC2981.sol';
import '@openzeppelin/contracts/access/Ownable2Step.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';
/// @notice UNREVIEWED v2. Native-CRO funded offers and escrow listings. Zero platform fee.
/// @dev New deployment, NOT an upgrade to RiftMarket. Reported ERC2981 royalties capped at 10%.
contract RiftExchange is ERC721Holder, ERC1155Holder, Ownable2Step, Pausable, ReentrancyGuard {
 struct Listing {address seller;address nft;uint256 tokenId;uint256 unitPrice;uint256 remaining;uint64 expiry;address buyer;bool multi;}
 struct Offer {address buyer;address nft;uint256 tokenId;uint256 unitPrice;uint256 remaining;uint64 expiry;uint8 scope;bytes32 root;bool multi;}
 mapping(uint256=>Listing)public listings;
 mapping(uint256=>Offer)public offers;
 mapping(address=>uint256)public proceeds;
 mapping(uint256=>mapping(uint256=>bool))public filled721;
 uint256 public nextListing;uint256 public nextOffer;
 address private receivingNFT;address private receivingFrom;uint256 private receivingId;uint256 private receivingAmount;
 event Listed(uint256 indexed id,address indexed seller,address indexed nft,uint256 tokenId,uint256 quantity,uint256 unitPrice,uint64 expiry,address buyer,bool multi);
 event Bought(uint256 indexed id,address indexed buyer,uint256 quantity,uint256 gross);
 event ListingCancelled(uint256 indexed id);
 event OfferMade(uint256 indexed id,address indexed buyer,address indexed nft,uint256 tokenId,uint256 quantity,uint256 unitPrice,uint64 expiry,uint8 scope,bytes32 root,bool multi);
 event OfferFilled(uint256 indexed id,address indexed seller,uint256 tokenId,uint256 quantity,uint256 gross);
 event OfferClosed(uint256 indexed id,uint256 refund);
 event SaleCredit(address indexed nft,uint256 indexed tokenId,address indexed seller,uint256 gross,address royaltyReceiver,uint256 royalty);
 event Withdrawn(address indexed account,address indexed recipient,uint256 amount);
 constructor(address admin)Ownable(admin){}
 function _standard(address nft,bool multi)internal view{require(nft.code.length>0&&IERC165(nft).supportsInterface(multi?bytes4(0xd9b67a26):bytes4(0x80ac58cd)),'Unsupported NFT');}
 function _quantity(bool multi,uint256 quantity)internal pure{require(quantity>0&&(multi||quantity==1),'Invalid quantity');}
 function _transfer(address nft,bool multi,address from,address to,uint256 tokenId,uint256 quantity)internal{if(multi)IERC1155(nft).safeTransferFrom(from,to,tokenId,quantity,'');else IERC721(nft).safeTransferFrom(from,to,tokenId);}
 function list(address nft,uint256 tokenId,uint256 quantity,uint256 unitPrice,uint64 expiry,address buyer,bool multi)external nonReentrant whenNotPaused returns(uint256 id){
  _standard(nft,multi);_quantity(multi,quantity);require(unitPrice>0&&(expiry==0||expiry>block.timestamp),'Invalid price/expiry');require(buyer!=msg.sender,'Own private order');
  uint256 balance=multi?IERC1155(nft).balanceOf(address(this),tokenId):0;
  if(!multi)require(IERC721(nft).ownerOf(tokenId)==msg.sender,'Not owner');
  id=nextListing++;listings[id]=Listing(msg.sender,nft,tokenId,unitPrice,quantity,expiry,buyer,multi);
  receivingNFT=nft;receivingFrom=msg.sender;receivingId=tokenId;receivingAmount=quantity;
  _transfer(nft,multi,msg.sender,address(this),tokenId,quantity);
  require(receivingNFT==address(0),'Missing receiver callback');
  require(multi?IERC1155(nft).balanceOf(address(this),tokenId)==balance+quantity:IERC721(nft).ownerOf(tokenId)==address(this),'Escrow failed');
  emit Listed(id,msg.sender,nft,tokenId,quantity,unitPrice,expiry,buyer,multi);
 }
 function _receive(address operator,address from,uint256 tokenId,uint256 amount)internal{require(msg.sender==receivingNFT&&operator==address(this)&&from==receivingFrom&&tokenId==receivingId&&amount==receivingAmount,'Unexpected NFT transfer');receivingNFT=address(0);receivingFrom=address(0);delete receivingId;delete receivingAmount;}
 function onERC721Received(address operator,address from,uint256 id,bytes memory)public override returns(bytes4){_receive(operator,from,id,1);return this.onERC721Received.selector;}
 function onERC1155Received(address operator,address from,uint256 id,uint256 amount,bytes memory)public override returns(bytes4){_receive(operator,from,id,amount);return this.onERC1155Received.selector;}
 function onERC1155BatchReceived(address,address,uint256[] memory,uint256[] memory,bytes memory)public pure override returns(bytes4){revert('Batch deposits disabled');}
 function _credit(address nft,uint256 tokenId,uint256 gross,address seller)internal{
  address receiver;uint256 royalty;
  if(IERC165(nft).supportsInterface(type(IERC2981).interfaceId)){(receiver,royalty)=IERC2981(nft).royaltyInfo(tokenId,gross);require(royalty<=gross/10&&(royalty==0||receiver!=address(0)),'Unsupported royalty');}
  proceeds[seller]+=gross-royalty;if(royalty>0)proceeds[receiver]+=royalty;emit SaleCredit(nft,tokenId,seller,gross,receiver,royalty);
 }
 function _buy(uint256 id,uint256 quantity)internal{
  Listing storage a=listings[id];_quantity(a.multi,quantity);require(a.remaining>=quantity&&a.remaining>0,'Inactive/quantity');require(a.expiry==0||block.timestamp<a.expiry,'Expired');require(msg.sender!=a.seller&&(a.buyer==address(0)||a.buyer==msg.sender),'Buyer restricted');
  a.remaining-=quantity;uint256 gross=a.unitPrice*quantity;_credit(a.nft,a.tokenId,gross,a.seller);_transfer(a.nft,a.multi,address(this),msg.sender,a.tokenId,quantity);emit Bought(id,msg.sender,quantity,gross);
 }
 function buy(uint256 id,uint256 quantity)external payable nonReentrant whenNotPaused{require(msg.value==listings[id].unitPrice*quantity,'Wrong payment');_buy(id,quantity);}
 function buyBatch(uint256[] calldata ids,uint256[] calldata quantities)external payable nonReentrant whenNotPaused{
  require(ids.length>0&&ids.length<=20&&ids.length==quantities.length,'Invalid batch');uint256 total;for(uint256 i;i<ids.length;i++)total+=listings[ids[i]].unitPrice*quantities[i];require(msg.value==total,'Wrong payment');for(uint256 i;i<ids.length;i++)_buy(ids[i],quantities[i]);
 }
 function cancelListing(uint256 id)external nonReentrant{Listing storage a=listings[id];uint256 amount=a.remaining;require(amount>0&&msg.sender==a.seller,'Not seller/closed');a.remaining=0;_transfer(a.nft,a.multi,address(this),a.seller,a.tokenId,amount);emit ListingCancelled(id);}
 /// @param scope 0 exact token, 1 any token in collection, 2 Merkle token-ID criteria (e.g. trait set).
 /// @dev Criteria leaves double-hash abi.encode(tokenId); sorted-pair proofs. Roots are immutable, not an off-chain trait assertion.
 function makeOffer(address nft,uint256 tokenId,uint256 unitPrice,uint256 quantity,uint64 expiry,uint8 scope,bytes32 root,bool multi)external payable nonReentrant whenNotPaused returns(uint256 id){
  _standard(nft,multi);require(unitPrice>0&&quantity>0&&expiry>block.timestamp,'Invalid offer');require(scope<=2&&(scope==2?root!=bytes32(0):root==bytes32(0)),'Invalid criteria');require(scope==0||tokenId==0,'Noncanonical criteria');require(multi||scope!=0||quantity==1,'Invalid quantity');require(msg.value==unitPrice*quantity,'Wrong funding');
  id=nextOffer++;offers[id]=Offer(msg.sender,nft,tokenId,unitPrice,quantity,expiry,scope,root,multi);emit OfferMade(id,msg.sender,nft,tokenId,quantity,unitPrice,expiry,scope,root,multi);
 }
 function acceptOffer(uint256 id,uint256 tokenId,uint256 quantity,bytes32[] calldata proof)external nonReentrant whenNotPaused{
  Offer storage a=offers[id];_quantity(a.multi,quantity);require(a.remaining>=quantity&&a.remaining>0&&block.timestamp<a.expiry,'Closed/expired');require(msg.sender!=a.buyer,'Own offer');
  if(a.scope==0)require(tokenId==a.tokenId,'Wrong token');else if(a.scope==2)require(MerkleProof.verifyCalldata(proof,a.root,keccak256(bytes.concat(keccak256(abi.encode(tokenId))))),'Invalid criteria proof');
  if(!a.multi){require(!filled721[id][tokenId],'Token already filled');filled721[id][tokenId]=true;}
  a.remaining-=quantity;uint256 gross=a.unitPrice*quantity;_credit(a.nft,tokenId,gross,msg.sender);_transfer(a.nft,a.multi,msg.sender,a.buyer,tokenId,quantity);emit OfferFilled(id,msg.sender,tokenId,quantity,gross);
 }
 function closeOffer(uint256 id)external nonReentrant{Offer storage a=offers[id];require(a.remaining>0&&(msg.sender==a.buyer||block.timestamp>=a.expiry),'Not buyer/unexpired');uint256 refund=a.unitPrice*a.remaining;a.remaining=0;proceeds[a.buyer]+=refund;emit OfferClosed(id,refund);}
 function withdrawTo(address payable recipient)external nonReentrant{require(recipient!=address(0),'Zero recipient');uint256 amount=proceeds[msg.sender];require(amount>0,'No proceeds');proceeds[msg.sender]=0;(bool ok,)=recipient.call{value:amount}('');require(ok,'Withdrawal failed');emit Withdrawn(msg.sender,recipient,amount);}
 function pause()external onlyOwner{_pause();}function unpause()external onlyOwner{_unpause();}
 function renounceOwnership()public view override onlyOwner{revert('Use ownership transfer');}
}
