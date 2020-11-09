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
    this.contractAddress = config.contractAddress;
    this.rpcAddress = config.rpcAddress;
    this.abi = JSON.parse(config.abi);
    this.account = config.account;
    return this;
}