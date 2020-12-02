


function decodeBase58(encodedValue)
{
    require("../../../privatesky/psknode/bundles/openDSU");
    openDSURequire('overwrite-require');

    const openDsuCrypto = openDSURequire("opendsu").loadApi("crypto");
    return openDsuCrypto.decodeBase58(encodedValue);
}


function convertDerSignatureToASN1(derSignatureBuffer)
{
    require("../../../privatesky/psknode/bundles/openDSU");
    openDSURequire('overwrite-require');

    const openDsuCrypto = openDSURequire("opendsu").loadApi("crypto");
    return openDsuCrypto.convertDerSignatureToASN1(derSignatureBuffer);
}

module.exports = {
    decodeBase58,
    convertDerSignatureToASN1
}