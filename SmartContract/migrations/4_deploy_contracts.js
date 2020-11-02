const AnchorContract=artifacts.require("./AnchorContract.sol");
module.exports = function(deployer){
    deployer.deploy(AnchorContract);
};