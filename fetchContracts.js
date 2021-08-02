import { writeFile, readFileSync } from 'fs';
import axios from 'axios';
import DraftLog from 'draftlog';
import { getType } from './getType.js';

let configFile = process.argv[2];
let config = JSON.parse(readFileSync(configFile));

const endpoint = config.raribleEndpoint;
const requestSize = config.requestSize;

// Map of (contract address => type) where type is either "ERC721" or "ERC1155"
var allContracts = new Map(); 
var failedContracts = [];

var consoleUpdate = {};

var stats = {
    items: 0,
    total_contracts: 0,
    ERC721: 0,
    ERC1155: 0,
    TypeRequestQueue: 0,
    FailedItemRequests: 0,
    FailedTypeClassification: 0,
    Failed: 0
}

async function main() {

    let done = false;

    try {
        let res = await getPage();
        let [l, cont, data] = parseResponse(res);
        stats.items += l;

        startLogging();
        getTypeAndRecord(data);

        while (!done) {
            try {
                res = await getPage(cont);
                
                [l, cont, data] = parseResponse(res);

                stats.items += l;

                getTypeAndRecord(data);

                if (l==0) {
                    done = true;
                }
            } catch (err) {
                stats.FailedItemPages += 1;
                console.error(err);
                if (stats.FailedItemPages > 100) {
                    done = true;
                    console.log(`Fetching Items failed more than 100 times`);
                }
            }
            updateLog();
        }
        writeFiles();
    } catch (err) {
        console.error(err);
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

    return await axios.get(endpoint, { parameters });
}

function parseResponse(res) {
    let l = res.data.total;
    let cont = res.data.continuation;
    let data = res.data.items;
    return [l, cont, data];
}

function getTypeAndRecord(data) {
    for (let i of data) {
        let id = i.contract;

        if (!allContracts.has(id)) {
            stats.total_contracts += 1;
            stats.typeRequestQueue+= 1;
            updateLog();
            try {
                getType(id).then( (type) => {
                    if (type==1 || type==3) {
                        allContracts.set(id, 'ERC721');
                        stats.ERC721 += 1;
                    } else if (type==2 || type==4) {
                        allContracts.set(id, 'ERC1155');
                        stats.ERC1155 += 1;
                    } else {
                        failedContracts.push(id);
                        stats.FailedTypeDetermination += 1;
                    }
                });
            } catch (err) {
                failedContracts.push(id);
                console.error(err);
            }
            stats.typeRequestQueue-= 1;
            updateLog();
        }
    }
}

function startLogging() {
    DraftLog(console);
    consoleUpdate.line1 = console.draft();
    consoleUpdate.line2 = console.draft();
    consoleUpdate.line3 = console.draft();
    updateLog();
}

function updateLog() {
    consoleUpdate.line1(`Fetched Contract addresses: ${stats.items}.`);
    consoleUpdate.line2(`Contracts that need to get the type determined:` + 
    `${stats.TypeRequestQueue}`);
    consoleUpdate.line3(`Total ERC721: ${stats.ERC721}; Total ERC1155:` +
    `${stats.ERC1155}; Total Failed Type: ${stats.FailedTypeRequests};` + 
    `Total Contracts: ${stats.total_contracts}`);
}

function writeFiles() {
    writeFile( config.outputFileName, JSON.stringify(allContracts), function(err) {
        if (err) throw err;
        console.log(`All Rarible Contracts are written to ${config.outputFileName}`);
    });
}

main().then(
    result => {
        console.log(resullt);
    }
).catch(
    err => {
        console.error(err);
    }
)
