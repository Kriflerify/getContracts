import { readFileSync, writeFileSync } from 'fs';
import { SingleBar, Presets } from 'cli-progress';
import Web3 from 'web3';
import * as signatures from './ids.js';



let configFile = process.argv[2];
let config = JSON.parse(readFileSync(configFile));

const ethNode = config.ethNodeURL;
const web3 = new Web3(ethNode);

const contractsFileName = config.outputFileName
// try {
//     const allContracts = JSON.parse(readFileSync(contractsFileName));
// } catch (err) {
//     console.error(`File ${contractsFileName} containing list of contracts not found. Consider using fetch.js` );
//     console.error(err);
// }

// let contractType = new Map(); // mapping of type (contract address => type)
// let errorContracts = [];

// const progressBar = new SingleBar({}, Presets.shades_classic);

async function main() {

    progressBar.start(contractType.length, 0);
    let i = 0;

    for (let c of allContracts) {
        try{
            let type = await getType(c);

            if (type==5) {
                errorContracts.push(c);
            } else {
                contractType.set(c, type);
            }
        } catch (err) {
            errorContracts.push(c);
            contractType.set(c, 5);
            console.log(err);
        }
        i += 1;
        progressBar.update(i);
    }
    progressBar.stop();
    writeFiles();
    // stats();
    return "DONE SORTING CONTRACTS BY TYPE";
}

export async function getType(c) {
    let res = await getCode(c);
    let type = recognizeCode(res);

    if (type==0) {
        let ci = await getImplementation(c);
        res = await getCode(ci);
        type = recognizeCode(res);
    }
    return type;
}

async function getCode(c) {
    return web3.eth.getCode(c);
}

async function getImplementation(c) {
    let a = await web3.eth.getStorageAt(c, signatures.implementationSlot);
    a = a.substring(26);
    return web3.utils.toChecksumAddress("0x" + a);
}

function recognizeCode(code) {
    if (code.includes(signatures.Upgrade)) {
        return 0;
    } else if (code.includes(signatures.ERC721Rarible)) {
        return 1;
    } else if (code.includes(signatures.ERC1155Rarible)) {
        return 2;
    } else if (code.includes(signatures.ERC721_1) &&
            code.includes(signatures.ERC721_2)) {
        return 3;
    } else if (code.includes(signatures.ERC1155)) {
        return 4;
    } else {
        return 5;
    }
}

function writeFiles() {
    writeFileSync("contractTypes.json", JSON.stringify(contractType));
    writeFileSync("errorContracts.json", JSON.stringify(errorContracts));
}

// main().then(
//     result => {
//         console.log(result);
//     },
//     err => {
//         console.error(err);
//     }
// )
