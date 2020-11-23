const path = require('path');

function makeRequest(protocol, hostname, port, method, path, body, headers, callback) {

    const http = require("http");
    const https = require("https");

    if (typeof headers === "function") {
        callback = headers;
        headers = undefined;
    }

    if (typeof body === "function") {
        callback = body;
        headers = undefined;
        body = undefined;
    }

    protocol = require(protocol);
    const options = {
        hostname: hostname,
        port: port,
        path,
        method,
        headers
    };
    const req = protocol.request(options, response => {

        if (response.statusCode < 200 || response.statusCode >= 300) {
            return callback({
                statusCode: response.statusCode,
                err: new Error("Failed to execute command. StatusCode " + response.statusCode)
            }, null);
        }
        let data = [];
        response.on('data', chunk => {
            data.push(chunk);
        });

        response.on('end', () => {
            try {
                const bodyContent = Buffer.concat(data).toString();
                return callback(undefined, bodyContent);
            } catch (error) {
                return callback({
                    statusCode: 500,
                    err: error
                }, null);
            }
        });
    });

    req.on('error', err => {
        console.log(err);
        return callback({
            statusCode: 500,
            err: err
        });
    });

    req.write(body);
    req.end();
};

function getConfig() {
    let config;
    if (typeof process.env.ANCHOR_SMARTCONTRACT_CONFIG_FOLDER !== 'undefined') {
        config = require(path.join(path.resolve(process.env.ANCHOR_SMARTCONTRACT_CONFIG_FOLDER), "config.json"));
    } else {
        config = require(path.join(path.resolve('./config'), "config.json"));
    }

    console.log('loaded config :', config);
    return config;
}

module.exports = function Config(callback) {
    const config = getConfig();
    let contractAddress;
    if (typeof process.env.CONTRACT_ADDRESS !== "undefined")
    {
        console.log('Using env CONTRACT_ADDRESS : ', process.env.CONTRACT_ADDRESS, typeof process.env.CONTRACT_ADDRESS);
        contractAddress =  process.env.CONTRACT_ADDRESS;
    }else {
        contractAddress = config.contractAddress;
    }
    let rpcAddress;
    if (typeof process.env.RPC_ADDRESS !== "undefined")
    {
        console.log('Using env RPC_ADDRESS : ', process.env.RPC_ADDRESS);
        rpcAddress =  process.env.RPC_ADDRESS;
    }else {
        rpcAddress = config.rpcAddress;
    }

    let account;
    if (typeof process.env.ACCOUNT !== "undefined")
    {
        console.log('Using env ACCOUNT : ', process.env.ACCOUNT);
        account =  process.env.ACCOUNT;
    }else {
        account = config.account;
    }
    let apiContractAddress;
    if (typeof process.env.SMARTCONTRACT_ENDPOINT !== "undefined")
    {
        console.log('Using env SMARTCONTRACT_ENDPOINT : ', process.env.SMARTCONTRACT_ENDPOINT);
        const endpointURL =  new URL(process.env.SMARTCONTRACT_ENDPOINT);
        const apiEndpoint = endpointURL.hostname;
        const apiPort = endpointURL.port;
        const protocol = endpointURL.protocol.replace(':',"");
        const body = {};
        const bodyData = JSON.stringify(body);
        const apiPath = '/contractAddress';
        const apiMethod = 'GET';
        const apiHeaders = {
            'Content-Type': 'application/json',
            'Content-Length': bodyData.length
        };

        try {
            makeRequest(protocol, apiEndpoint, apiPort, apiMethod, apiPath, bodyData, apiHeaders, (err, result) => {
                if (err)
                {
                    console.log(err);
                    //fallback to config
                    this.contractAddress = contractAddress;
                } else {
                    const apicontractaddress = JSON.parse(result).contractAddress
                    this.contractAddress = apicontractaddress;
                }

                //get abi from endpoint
                const apiPath = '/abi';
                makeRequest(protocol, apiEndpoint, apiPort, apiMethod, apiPath, bodyData, apiHeaders, (err, result) => {
                    if (err)
                    {
                        console.log(err);
                        //fallback to config
                        this.abi = JSON.parse(config.abi);
                    } else {
                        const abi = JSON.parse(result).abi;
                        this.abi = abi;
                    }

                    //finish update configuration & return
                    this.rpcAddress = rpcAddress;
                    this.account = account;
                    console.log(this);
                    console.log('finish loading config from smart contract endpoint.');
                    callback(null, this);


                });
            } );
        } catch (err)
        {
            console.log(err);
            callback(err, null);
        }
    }
    else{
        this.contractAddress = contractAddress;
        this.rpcAddress = rpcAddress;
        this.abi = JSON.parse(config.abi);
        this.account = account;
        console.log('finish loading config from env parameters and local config file.')
        callback(null, this);
    }
};