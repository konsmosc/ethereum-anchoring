
function createAddAnchorHandler(anchorFactory, account) {
    return function (request, response, next) {

        const anchorID = request.params.keySSI;

        const body = request.body;
        console.log("body received : ", body);
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
            const openDsuUtils = require('../utils/opendsuutils');
            const keySSI = Buffer.from(openDsuUtils.decodeBase58(anchorID)).toString().split(':');
            console.log("Decoded from", anchorID," into KEYSSI : ", keySSI);
            /*
             string anchorID - addAnchor param
             string keySSIType - keySSI[1]
             string controlString - keySSI[4]
             string vn - keySSI[5]
             string newHashLinkSSI - body
             string ZKPValue - body.zkp
             string lastHashLinkSSI - body
             string signature - body.digitalProof.signature
             string publicKey - body.digitalProof.publicKey
             */

            let controlSubstring = Buffer.from(openDsuUtils.decodeBase58(keySSI[4])).toString('hex');
            const versionNumber = keySSI[5];
            const keySSIType = keySSI[1];
            const newHashLinkSSI = body.hash.newHashLinkSSI;
            const lastHashLinkSSI = body.hash.lastHashLinkSSI == null ? newHashLinkSSI : body.hash.lastHashLinkSSI;
            const zkpValue = body.zkp;

            let signature65;
            let prefixedPublicKey;
            if (controlSubstring === "")
            {
                //ConstSSI
               signature65 = "0x00";
               prefixedPublicKey = "0x00";
               controlSubstring = "0x00";
            }
            else {
                controlSubstring = '0x'+controlSubstring;

                //handle public key
                prefixedPublicKey = getPublicKeyForSmartContract(body.digitalProof.publicKey);

                //handle signature
                signature65 = getSignatureForSmartContract(body.digitalProof.signature,anchorID,
                    newHashLinkSSI,zkpValue,lastHashLinkSSI,body.digitalProof.publicKey);
            }


            require("../anchoring/addAnchorSmartContract")(anchorFactory.contract, account,
                anchorID, keySSIType, controlSubstring,
                versionNumber, newHashLinkSSI, zkpValue, lastHashLinkSSI,
                signature65, prefixedPublicKey,
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

function getPublicKeyForSmartContract(publicKeyRaw)
{
    const openDsuUtils = require('../utils/opendsuutils');
    console.log('public key RAW : ',publicKeyRaw);
    const publicKey = openDsuUtils.decodeBase58(publicKeyRaw);
    const prefixedPublicKey = '0x'+publicKey.toString('hex');
    console.log('prefixed pub key : ', prefixedPublicKey);

    return prefixedPublicKey;
}

function getSignatureForSmartContract(signatureDERFormatEncoded,anchorID,newHashLinkSSI,zkpValue,lastHashLinkSSI,publicKeyRaw)
{
    const openDsuUtils = require('../utils/opendsuutils');
    console.log('signature : ', signatureDERFormatEncoded);
    const derSignature = openDsuUtils.decodeBase58(signatureDERFormatEncoded);
    const signature64 = openDsuUtils.convertDerSignatureToASN1(Buffer.from(derSignature,'hex'));
    const publicKey = openDsuUtils.decodeBase58(publicKeyRaw);



    const valueToHash = anchorID+newHashLinkSSI
        + zkpValue
        + (newHashLinkSSI === lastHashLinkSSI || lastHashLinkSSI === '' ? '' : lastHashLinkSSI)
    console.log('value to hash : ',valueToHash);
    const signature65 = require('../utils/eth').getVSignature(signature64,publicKey,valueToHash);

    console.log ('signature send to smart contract : ', signature65);

    return signature65;
}

module.exports = {
    createAddAnchorHandler,
    getSignatureForSmartContract,
    getPublicKeyForSmartContract
};