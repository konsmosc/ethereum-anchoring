const AnchorContract=artifacts.require("./AnchorContract.sol");
module.exports = function(deployer){
    deployer.deploy(AnchorContract)
    .then((instance) => {
        const fs = require('fs').writeFileSync('external/smartcontractaddress.txt',instance.address);
    });
};