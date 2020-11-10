const path = require('path');


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

module.exports = function Config() {
    const config = getConfig();
    let contractAddress;
    if (typeof process.env.CONTRACT_ADDRESS !== undefined)
    {
        contractAddress =  process.env.CONTRACT_ADDRESS;
    }else {
        contractAddress = config.contractAddress;
    }
    let rpcAddress;
    if (typeof process.env.RPC_ADDRESS !== undefined)
    {
        rpcAddress =  process.env.RPC_ADDRESS;
    }else {
        rpcAddress = config.rpcAddress;
    }

    let account;
    if (typeof process.env.ACCOUNT !== undefined)
    {
        account =  process.env.ACCOUNT;
    }else {
        account = config.account;
    }

    this.contractAddress = contractAddress;
    this.rpcAddress = rpcAddress;
    this.abi = JSON.parse(config.abi);
    this.account = account;
    return this;
}