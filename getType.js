import * as signatures from './ids.js';
import { requestSupportsInterface } from './batchRequests.js';

export async function getType(c) {
    let e721 = await requestSupportsInterface(c, signatures.ERC721ID);
    if (e721) {
        let e721rar = await requestSupportsInterface(c, signatures.ERC721RaribleID);
        if (e721rar) {
            return "ERC721RARIBLE";
        } else {
            return "ERC721";
        }
    } 
    let e1155 = await requestSupportsInterface(c, signatures.ERC1155ID);
    if (e1155) {
        let e1155rar = await requestSupportsInterface(c, signatures.ERC1155RaribleID);
        if (e1155rar) {
            return "ERC1155RARIBLE";
        } else {
            return "ERC1155";
        }
    }
    return "UNKNOWN";
}

// async function getCode(c) {
//     return web3.eth.getCode(c);
// }

// async function getImplementation(c) {
//     let a = await web3.eth.getStorageAt(c, signatures.implementationSlot);
//     a = a.substring(26);
//     return web3.utils.toChecksumAddress("0x" + a);
// }

// function recognizeCode(code) {
//     if (code.includes(signatures.Upgrade)) {
//         return 0;
//     } else if (code.includes(signatures.ERC721Rarible)) {
//         return 1;
//     } else if (code.includes(signatures.ERC1155Rarible)) {
//         return 2;
//     } else if (code.includes(signatures.ERC721_1) &&
//             code.includes(signatures.ERC721_2)) {
//         return 3;
//     } else if (code.includes(signatures.ERC1155)) {
//         return 4;
//     } else {
//         return 5;
//     }
// }

// function writeFiles() {
//     writeFileSync("contractTypes.json", JSON.stringify(contractType));
//     writeFileSync("errorContracts.json", JSON.stringify(errorContracts));
// }