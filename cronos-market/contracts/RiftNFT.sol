// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
contract RiftNFT is ERC721URIStorage, ReentrancyGuard {
 uint256 public nextTokenId;
 uint256 public constant MAX_URI_LENGTH = 2048;
 constructor() ERC721('RIFT Genesis','RIFT') {}
 function mint(string calldata uri) external nonReentrant returns(uint256 id) {
  require(bytes(uri).length>0 && bytes(uri).length<=MAX_URI_LENGTH,'Invalid URI');
  id=nextTokenId++; _safeMint(msg.sender,id); _setTokenURI(id,uri);
 }
}
