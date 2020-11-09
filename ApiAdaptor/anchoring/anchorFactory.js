module.exports = function Factory(rpcAddress, contractAddress, abi) {
    this.web3 = buildFactory(rpcAddress, contractAddress, abi);
    this.contract = new this.web3.eth.Contract(abi, contractAddress);


    function buildFactory(rpcAddress) {
        const Web3 = require('web3');
        return new Web3(new Web3.providers.HttpProvider(rpcAddress));
    }


};