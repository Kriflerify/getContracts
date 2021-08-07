import Web3 from 'web3'

export const implementationSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"

export const Upgrade = implementationSlot.substring(2);

let hash = Web3.utils.keccak256;

export const ERC721Rarible = hash('CreateERC721Rarible(address,string,string)').substring(2);

export const ERC1155Rarible = hash('CreateERC1155Rarible(address,string,string)').substring(2);

export const ERC721_1 = hash('Transfer(address,address,uint256)').substring(2);

export const ERC721_2 = hash('ApprovalForAll(address,address,bool)').substring(2);

export const ERC1155 = hash('TransferBatch(address,address,address,uint256[],uint256[])').substring(2);


// ERC165 Interface IDs
export const ERC721ID = "0x80ac58cd";

export const ERC1155ID = "0xd9b67a26";

// registered in ERC721Lazy.sol
export const ERC721RaribleID = "0x8486f69f";

// registered in ERC1155Lazy.sol
export const ERC1155RaribleID = "0x6db15a0f";