//opendsu
require("../../../privatesky/psknode/bundles/openDSU");
const or = openDSURequire('overwrite-require');
or.enableForEnvironment(or.constants.NODEJS_ENVIRONMENT_TYPE);
//end open dsu


function decodeBase58(encodedValue)
{
    const openDsuCrypto = openDSURequire("opendsu").loadApi("crypto");
    return openDsuCrypto.decodeBase58(encodedValue);
}


function convertDerSignatureToASN1(derSignatureBuffer)
{
    const openDsuCrypto = openDSURequire("opendsu").loadApi("crypto");
    return openDsuCrypto.convertDerSignatureToASN1(derSignatureBuffer);
}

module.exports = {
    decodeBase58,
    convertDerSignatureToASN1
}