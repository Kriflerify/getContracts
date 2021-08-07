import { writeFile, readFileSync } from 'fs';
import axios from 'axios';
import DraftLog from 'draftlog';
import { getConstructionBlock } from './etherscanRequests.js';
import { getType } from './getType.js'
import { endBatchRequests } from './batchRequests.js';


let configFile = process.argv[2];
let config = JSON.parse(readFileSync(configFile));

const endpoint = config.raribleEndpoint;
const requestSize = config.requestSize;

let newestKnownItem = config.newestKnownItem;
// Map of (contract address => type) where type is either "ERC721" or "ERC1155"
// var allContracts = new Map(); 
var allContracts = {
    ERC721: [],
    ERC1155: [],
    ERC721RARIBLE: [],
    ERC1155RARIBLE: []
};
var failedContracts = [];
var processed = [];

var earliest = {
    ERC721: [0,999999999999],   
    ERC1155: [0,999999999999],   
    ERC721RARIBLE: [0,999999999999],   
    ERC1155RARIBLE: [0,999999999999],   
};

var consoleUpdate = {};

var stats = {
    items: 0,
    total_contracts: 0,
    ERC721: 0,
    ERC1155: 0,
    ERC721RARIBLE: 0,
    ERC1155RARIBLE: 0,
    typeRequestQueue: 0,
    creationBlockRequestQueue: 0,
    FailedItemPages: 0,
    FailedTypeClassification: 0,
    FailedTypeRequest: 0,
    Failed: 0,
    lastTime: 0,
    perf: 0,
    newestItem: 0,
};

let done = false;

async function main() {
    try {
        let res = await getPage();
        let [length, continuation, data] = parseResponse(res);
        stats.items += length;

        startLogging();
        postproccess(data);

        while (!done) {
            try {
                res = await getPage(continuation);
                [length, continuation, data] = parseResponse(res);
                stats.items += length;
                stats.newestItem = data[0].id;
                measurePerf(length);

                // Find out type and creation block of all contracts of all received nfts
                postproccess(data);

                if (length==0) {
                    done = true;
                }
            } catch (err) {
                stats.FailedItemPages += 1;
                console.log(err);
                if (stats.FailedItemPages > 100) {
                    done = true;
                    console.log(`Fetching Items failed more than 100 times`);
                }
            }
            updateLog();
        }
        writeFiles();
        endBatchRequests();
    } catch (err) {
        console.log(err);
    }
}


async function getPage(cont = 0) {
    let parameters = {};
    if (cont == 0) {
        parameters = { size: requestSize };
    } else {
        parameters = { continuation: cont,
                    size: requestSize };
    }

    return await axios.get(endpoint, { params: parameters });
}

function parseResponse(res) {
    let l = res.data.total;
    let cont = res.data.continuation;
    let data = res.data.items;
    return [l, cont, data];
}

function postproccess(data) {
    for (let item of data) {
        let address = item.contract;
        if (checkIfReachedDone(item.id)){
            return;
        }

        if (!processed.includes(address)) {
            processed.push(address);
            stats.total_contracts += 1;
            stats.typeRequestQueue+= 1;
            updateLog();
            getType(address).then( (type) => {
                if (type=="UNKNOWN") {
                    failedContracts.push(address);
                    stats.FailedTypeClassification += 1;
                } else {
                    if (type=="ERC721") {
                        allContracts.ERC721.push(address);
                        stats.ERC721 += 1;
                    } else if (type=="ERC1155") {
                        allContracts.ERC1155.push(address);
                        stats.ERC1155 += 1;
                    } else if (type="ERC721RARIBLE") {
                        allContracts.ERC721RARIBLE.push(address);
                        stats.ERC721RARIBLE += 1;
                    } else if (type="ERC1155RARIBLE") {
                        allContracts.ERC1155RARIBLE.push(address);
                        stats.ERC1155RARIBLE += 1;
                    }
                    stats.typeRequestQueue-= 1;
                    updateLog();
                    // findEarliestContract(id, type);
                }
            }).catch((err) => {
                console.log(`ERROR at reading contract with address ${address}: ${err}`);
                failedContracts.push(address);
                stats.FailedTypeRequest += 1;
                stats.typeRequestQueue -= 1;
                updateLog();
            });
        }
    }
}

async function findEarliestContract(address, type) {
    // for (let i of data) {
    //     let address = i.contract;

        try {
            stats.creationBlockRequestQueue += 1;
            updateLog();
            let block = await getConstructionBlock(address);
            if (earliest[type][1] > block) {
                earliest[type][1] = block;
                earliest[type][0] = address;
            }
            stats.creationBlockRequestQueue -= 1;
            updateLog();
        } catch (err) {
            console.log(err);
            failedContracts.push(address);
            stats.creationBlockRequestQueue -= 1;
            updateLog();
        }
    // }
}

function checkIfReachedDone(id) {
    if (id == newestKnownItem) {
        done = true;
        return true;
    }
    return false;
}

function measurePerf(l) {
    stats.perf = 1000 * l / (Date.now() - stats.lastTime);
    stats.lastTime = Date.now();
}

function startLogging() {
    DraftLog(console);
    consoleUpdate.line1 = console.draft();
    consoleUpdate.line2 = console.draft();
    consoleUpdate.line3 = console.draft();
    consoleUpdate.line4 = console.draft();
    consoleUpdate.line5 = console.draft();
    consoleUpdate.line6 = console.draft();
    consoleUpdate.line7 = console.draft();
    updateLog();
}

function updateLog() {
    consoleUpdate.line1(`Fetched Contract addresses: ${stats.items}. ` +
    `Total Contracts: ${stats.total_contracts}`);
    consoleUpdate.line2(`Contracts waiting to get the type determined: ` + 
    `${stats.typeRequestQueue}`);
    consoleUpdate.line3(`Contracts waiting to get the creation Block determined: ` + 
    `${stats.creationBlockRequestQueue}`);
    consoleUpdate.line4(`Total ERC721: ${stats.ERC721}; Total ERC1155: ` +
    `${stats.ERC1155}; Total ERC721RARIBLE: ${stats.ERC721RARIBLE}; Total ERC1155RARIBLE: ${stats.ERC1155RARIBLE};`);
    consoleUpdate.line5(`Earliest ERC721: ${earliest.ERC721[1]}, ERC1155: ${earliest.ERC1155[1]}, ` +
    `ERC721Rarible: ${earliest.ERC721RARIBLE[1]}, ERC1155Rarible: ${earliest.ERC1155RARIBLE[1]}`);
    consoleUpdate.line6(`Total Failed Type Classification: ${stats.FailedTypeClassification} ` + 
    `Failed TypeRequests: ${stats.FailedTypeRequest}`);
    consoleUpdate.line7(`NFTs per second: ${stats.perf}`);
}

function writeFiles() {
    writeFile( config.outputFileName, JSON.stringify(allContracts), function(err) {
        if (err) throw err;
        console.log(`All contracts and Types are written to ${config.outputFileName}`);
    });
    writeFile( config.outputFileNameFailed, JSON.stringify(failedContracts), function(err) {
        if (err) throw err;
        console.log(`Contracts that could not be determined are ` +
            `written to ${config.outputFileNameFailed}`);
    });
    console.log(`earliest ERC721: ${earliest.ERC721[1]}, ERC1155: ${earliest.ERC1155[1]}` +
    `ERC721Rarible: ${earliest.ERC721RARIBLE}, ERC1155Rarible: ${earliest.ERC1155RARIBLE}`);
    console.log(`The newest Item received from the Rarible API has id ${stats.newestItem}`);
}

main().then(
    result => {
        console.log(result);
    }
).catch(
    err => {
        console.log(err);
    }
)
