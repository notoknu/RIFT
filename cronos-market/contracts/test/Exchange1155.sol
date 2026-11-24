// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';
import '@openzeppelin/contracts/token/common/ERC2981.sol';
/// @dev Test asset only. Not a launch template.
contract Exchange1155 is ERC1155,ERC2981 {
 constructor()ERC1155('ipfs://test-only/{id}.json'){}
 function mint(address to,uint256 id,uint256 amount)external{_mint(to,id,amount,'');}
 function royalty(address receiver,uint96 bps)external{_setDefaultRoyalty(receiver,bps);}
 function supportsInterface(bytes4 id)public view override(ERC1155,ERC2981)returns(bool){return super.supportsInterface(id);}
}
