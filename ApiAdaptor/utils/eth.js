

function getVSignature(signature, publicKey, valueToHash){
    //hash
    const hashedValue = require('crypto').createHash('sha256').update(valueToHash).digest();
    //get account from hash & signature
    const eth = require('ethers');
    const signature1c = signature+'1c';
    const recoveredEthAddress1c = eth.utils.recoverAddress(hashedValue,signature1c);
    //convert publicKey to account
    const ethAccount = require('ethereum-public-key-to-address')(publicKey);
    //compare them for v
    if (ethAccount === recoveredEthAddress1c)
    {
        return '1c';
    }

    const signature1d = signature+'1d';
    const recoveredEthAddress1d = eth.utils.recoverAddress(hashedValue,signature1d);
    //compare them for v
    if (ethAccount === recoveredEthAddress1d)
    {
        return '1d';
    }
    console.log('signature 1c', signature1c);
    console.log('signature 1d', signature1d);
    console.log('received signature ', signature);
    console.log('Expected eth account ', ethAccount,' but got ',recoveredEthAddress1c,' and ',recoveredEthAddress1d);
    console.log('Unable to determine v !');
    throw ('Unable to determine v !');
}



module.exports = {
    getVSignature
};