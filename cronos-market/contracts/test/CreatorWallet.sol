// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
contract CreatorWallet {
 address public immutable signer;
 constructor(address authorized){signer=authorized;}
 function isValidSignature(bytes32 digest,bytes calldata signature)external view returns(bytes4){return ECDSA.recover(digest,signature)==signer?bytes4(0x1626ba7e):bytes4(0xffffffff);}
}
