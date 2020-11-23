const {encode, decode} = require('base58-universal');


function createAddAnchorHandler(anchorFactory, account) {
    return function (request, response, next) {

        const anchorID = request.params.keySSI;

        const body = request.body;

        try {
            if (body.hash.newHashLinkSSI === undefined || body.hash.lastHashLinkSSI === undefined) {
                console.log('Invalid body', body);
                return response.status(428).send('Invalid body');
            }
        } catch (err) {
            console.log(err);
            return response.status(428).send('Invalid body');
        }

        try {
            const keySSI = Buffer.from(decode(anchorID)).toString().split(':');
            // console.log("Decoded from", anchorID," into KEYSSI : ", keySSI);
            /*
             string anchorID - addAnchor param
             string keySSIType - keySSI[1]
             string controlString - keySSI[4]
             string vn - keySSI[5]
             string newHashLinkSSI - body
             string ZKPValue - todo
             string lastHashLinkSSI - body
             string signature - todo
             string publicKey - todo
             */

            const controlSubstring = Buffer.from(decode(keySSI[4])).toString('hex');
            const versionNumber = keySSI[5];
            const keySSIType = keySSI[1];
            const newHashLinkSSI = body.hash.newHashLinkSSI;
            const lastHashLinkSSI = body.hash.lastHashLinkSSI == null ? newHashLinkSSI : body.hash.lastHashLinkSSI;
            //  console.log(keySSI);
            //  console.log({controlSubstring,versionNumber,keySSIType});
            require("../anchoring/addAnchorSmartContract")(anchorFactory.contract, account,
                anchorID, keySSIType, '0x'+controlSubstring,
                versionNumber, newHashLinkSSI, "ZKPValue", lastHashLinkSSI,
                "0x00AA", "0x00AA",
                (err, result) => {

                    if (err) {
                        console.log("------------------------------------------------------")
                        console.log("response AddAnchor 428. Error : ", err);
                        console.log({
                            anchorID,
                            controlSubstring,
                            versionNumber,
                            keySSIType,
                            newHashLinkSSI,
                            lastHashLinkSSI
                        });
                        console.log("------------------------------------------------------")
                        return response.status(428).send("Smart contract invocation failed");
                    }
                    //anchorFactory.waitForFullCommit();
                    console.log("response AddAnchor 200", anchorID);
                    return response.status(200).send(result);
                })

        } catch (err) {
            console.log("------------------------------------------------------")
            console.log(anchorID);
            console.log(err);
            console.log("------------------------------------------------------")
            return response.status(428).send("Decoding failed");
        }


    }
}


module.exports = createAddAnchorHandler;