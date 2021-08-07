import { readFileSync } from 'fs';
import axios from 'axios';
import rateLimit from 'axios-rate-limit';

const configFile = process.argv[2];
const config = JSON.parse(readFileSync(configFile));

const etherscanEndpoint = config.etherscanEndpoint;
const apikey = config.etherscanAPIKey;
const http = rateLimit(axios.create(), { maxRPS: 4 });

export async function getConstructionBlock(c) {
    let res = await http.get(etherscanEndpoint, {
        params: {
            module: "account",
            action: "txlist",
            address: c,
            block: 0,
            endblock: 99999999,
            page: 1,
            offset: 1,
            sort: "asc",
            apikey: apikey
        }
    });

    if (res.data.status == '1') {
        let s = res.data.result[0].blockNumber;
        return s;
    } else {
        console.log(res);
        throw `ERROR while querrying tx history of contract ${c}: ${res.data.message}`+
        `${res.data.result}`;
    }
}
