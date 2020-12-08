function addAnchor(anchorFactory, account,
                   anchorID, keySSIType, controlString,
                   vn, newHashLinkSSI, ZKPValue, lastHashLinkSSI,
                   signature, publicKey,
                   callback) {

    console.log('Input for addAnchor smart contract : ',anchorID,keySSIType,controlString,
        vn, newHashLinkSSI, ZKPValue, lastHashLinkSSI,
        signature, publicKey);
    anchorFactory.methods.addAnchor(anchorID, keySSIType, controlString,
        vn, newHashLinkSSI, ZKPValue, lastHashLinkSSI,
        signature, publicKey).send({from: account, gas: 1500000}).then((f) => {
        const statusCode = f.events.InvokeStatus.returnValues.statusCode.toString().trim();
        console.log("Smart contract status code : ", statusCode);
        if (statusCode === "200" || statusCode === "201") {
            callback(null, "Success");
        } else {
            console.log("execute callback error : status code : <", statusCode, ">, EVAL :", statusCode === "200");
            callback(new Error("Status Code " + statusCode), null);
        }
    })
        .catch(err => {
            console.log({
                anchorID,
                keySSIType, controlString, vn, newHashLinkSSI, ZKPValue, lastHashLinkSSI, signature, publicKey, account
            });
            console.log(err);
            callback(err, null);
        });
}


module.exports = addAnchor;