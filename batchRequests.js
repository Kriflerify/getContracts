import Web3 from 'web3';
import { readFileSync } from 'fs';

const configFile = process.argv[2];
const config = JSON.parse(readFileSync(configFile));

const web3 = new Web3(new Web3.providers.HttpProvider(config.ethNodeURL));

let batch = new web3.eth.BatchRequest();
let batchSize = config.batchRequestSize;
const erc165ABI = JSON.parse(readFileSync("ERC165.json"));
let batchCounter = 0;

var running = false;
var requestLoop;

export async function requestSupportsInterface(to, id) {
    let res = new Promise( (resolve, reject) => {

        let contract = new web3.eth.Contract(erc165ABI, to);
        let params = {to: to, from: "0x0000000000000000000000000000000000000000" };
        batch.add(contract.methods.supportsInterface(id).call.request(params, (err, res) => {
            if (err) {
                // console.log(`failed at Contract ${to}\n${err}`);
                reject(err);
            } else {
                resolve(res);
            }}));
    });

    if (!running) {
        startLoop();
    }
    // incrementBatchCounter();
    return res;
}

function startLoop() {
    running = true;
    requestLoop = setInterval(() => {
        try {
            batch.execute();
        } catch (err) {
            console.log(`bach.execute failed with ${err}`);
            running = false;
        }
        batch = new web3.eth.BatchRequest();
    },1000);
}

function incrementBatchCounter() {
    batchCounter += 1; 

    if (batchCounter >= batchSize) {
        batchCounter = 0;
        try {
            batch.execute();
        } catch (err) {
            console.log(`bach.execute failed with ${err}`);
        }
        batch = new web3.eth.BatchRequest();
    } 
}

export function endBatchRequests() {
    setTimeout(() => {
        clearInterval(requestLoop);
        running = false;
    }, 10000);
}