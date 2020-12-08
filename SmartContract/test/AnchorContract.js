const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());

//opendsu
require("../../../privatesky/psknode/bundles/openDSU");
openDSURequire('overwrite-require');

//end open dsu

const fs = require('fs');
const solc = require('solc');

let anchorContract;
let accounts;

beforeEach(async () => {

    try {
        const source = fs.readFileSync('./contracts/AnchorContract.sol', 'utf8');
        var input = {
            language: 'Solidity',
            sources: {
                'AnchorContract.sol': {
                    content: source
                }
            },
            settings: {
                outputSelection: {
                    '*': {
                        '*': ['*']
                    }
                }
            }
        };


        const contrbase = JSON.parse(solc.compile(JSON.stringify(input))).contracts['AnchorContract.sol']['AnchorContract'];
        const abiInterface = contrbase.abi;
        const bytecode = contrbase.evm.bytecode.object;

        accounts = await web3.eth.getAccounts();

        anchorContract = await new web3.eth.Contract(abiInterface)
            .deploy({ data: bytecode })
            .send({ from: accounts[0], gas:3000000 });
    } catch (err)
    {
        console.log(err);
    }

});

describe('Anchor Contract', () => {


    it('deploys a contract', () => {
        assert.ok(anchorContract.options.address);
    });

    it ('can add anchor and get it\'s version back', async () => {
        const seedSSI = openDSURequire("opendsu").loadApi("keyssi").buildSeedSSI('default', 'teststring', 'control', 'v0', 'hint');
        const publicKeyRaw = seedSSI.getPublicKey("raw");
        const anchorID = seedSSI.getAnchorId();
        const newHashLinkSSI = "newHashLinkSSI";
        const lastHashLinkSSI = "newHashLinkSSI";

        const openDsuUtils = require('../../ApiAdaptor/utils/opendsuutils');
        const keySSI = Buffer.from(openDsuUtils.decodeBase58(anchorID)).toString().split(':');
        let controlSubstring = Buffer.from(openDsuUtils.decodeBase58(keySSI[4])).toString('hex');
        const versionNumber = keySSI[5];
        const keySSIType = keySSI[1];
        const zkpValue = "zkp";

        const openDsuCrypto = openDSURequire("opendsu").loadApi("crypto");

        //prepare for smartcontract
        controlSubstring = '0x'+controlSubstring;
        const publicKeyEncoded = openDsuCrypto.encodeBase58(publicKeyRaw);
        const prefixedPublicKey = require("../../ApiAdaptor/controllers/addAnchor").getPublicKeyForSmartContract(publicKeyEncoded);

        //handle signature

        const valueToHash = anchorID+newHashLinkSSI+zkpValue;

        const signature65 = getSignature(seedSSI,valueToHash,newHashLinkSSI,zkpValue,lastHashLinkSSI,publicKeyEncoded);


        const result = await anchorContract.methods.addAnchor(anchorID, keySSIType, controlSubstring,
            versionNumber, newHashLinkSSI, zkpValue, lastHashLinkSSI,
            signature65, prefixedPublicKey).send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result.events.InvokeStatus.returnValues.statusCode, 200);

        const anchors = await anchorContract.methods.getAnchorVersions(anchorID).call();

        assert.equal(anchors[0].ZKPValue, zkpValue);
        assert.equal(anchors[0].hash.newHashLinkSSI, newHashLinkSSI);
        assert.equal(anchors[0].hash.lastHashLinkSSI, lastHashLinkSSI);
        assert.equal(anchors.length, 1);
    });

    it ('read only anchors can be added only once', async () => {
        // read only anchors ignore every control field
        //can add only one
        const result = await anchorContract.methods.addAnchor("anchorID", "keySSIType", "0x",
            "vn", "newHashLinkSSI", "ZKPValue", "lastHashLinkSSI",
            "0x", "0x").send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result.events.InvokeStatus.returnValues.statusCode, 201);

        const result2 = await anchorContract.methods.addAnchor("anchorID", "keySSIType", "0x",
            "vn", "newHashLinkSSI", "ZKPValue", "lastHashLinkSSI",
            "0x", "0x").send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result2.events.InvokeStatus.returnValues.statusCode, 101);
    });


    it('anchor versions in sync for the same anchorID can be commited', async() => {

        const seedSSI = openDSURequire("opendsu").loadApi("keyssi").buildSeedSSI('default', 'teststring', 'control', 'v0', 'hint');
        const publicKeyRaw = seedSSI.getPublicKey("raw");
        const anchorID = seedSSI.getAnchorId();
        let newHashLinkSSI = "hashLinkSSI1";
        let lastHashLinkSSI = "hashLinkSSI1";

        const openDsuUtils = require('../../ApiAdaptor/utils/opendsuutils');
        const keySSI = Buffer.from(openDsuUtils.decodeBase58(anchorID)).toString().split(':');
        let controlSubstring = Buffer.from(openDsuUtils.decodeBase58(keySSI[4])).toString('hex');
        const versionNumber = keySSI[5];
        const keySSIType = keySSI[1];
        const zkpValue = "zkp";

        const openDsuCrypto = openDSURequire("opendsu").loadApi("crypto");

        //prepare for smartcontract
        controlSubstring = '0x'+controlSubstring;
        console.log("controlSubstring:",controlSubstring);
        const publicKeyEncoded = openDsuCrypto.encodeBase58(publicKeyRaw);
        const prefixedPublicKey = require("../../ApiAdaptor/controllers/addAnchor").getPublicKeyForSmartContract(publicKeyEncoded);

        //handle signature

        let valueToHash = anchorID+newHashLinkSSI+zkpValue;

        let signature65 = getSignature(seedSSI,valueToHash,newHashLinkSSI,zkpValue,lastHashLinkSSI,publicKeyEncoded);


        let result = await anchorContract.methods.addAnchor(anchorID, keySSIType, controlSubstring,
            versionNumber, newHashLinkSSI, zkpValue, lastHashLinkSSI,
            signature65, prefixedPublicKey).send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result.events.InvokeStatus.returnValues.statusCode, 200);

        newHashLinkSSI = "hashLinkSSI2";
        lastHashLinkSSI = "hashLinkSSI1";

        valueToHash = anchorID+newHashLinkSSI+zkpValue+lastHashLinkSSI;

        signature65 = getSignature(seedSSI,valueToHash,newHashLinkSSI,zkpValue,lastHashLinkSSI,publicKeyEncoded);


        result = await anchorContract.methods.addAnchor(anchorID, keySSIType, controlSubstring,
            versionNumber, newHashLinkSSI, zkpValue, lastHashLinkSSI,
            signature65, prefixedPublicKey).send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result.events.InvokeStatus.returnValues.statusCode, 200);

        const anchors = await anchorContract.methods.getAnchorVersions(anchorID).call();

        assert.equal(anchors.length, 2);
    });

    it ('cannot update anchor with empty control string' , async () => {

        const seedSSI = openDSURequire("opendsu").loadApi("keyssi").buildSeedSSI('default', 'teststring', 'control', 'v0', 'hint');
        const publicKeyRaw = seedSSI.getPublicKey("raw");
        const anchorID = seedSSI.getAnchorId();
        let newHashLinkSSI = "hashLinkSSI1";
        let lastHashLinkSSI = "hashLinkSSI1";

        const openDsuUtils = require('../../ApiAdaptor/utils/opendsuutils');
        const keySSI = Buffer.from(openDsuUtils.decodeBase58(anchorID)).toString().split(':');
        let controlSubstring = Buffer.from(openDsuUtils.decodeBase58(keySSI[4])).toString('hex');
        const versionNumber = keySSI[5];
        const keySSIType = keySSI[1];
        const zkpValue = "zkp";

        const openDsuCrypto = openDSURequire("opendsu").loadApi("crypto");

        //prepare for smartcontract
        controlSubstring = '0x'+controlSubstring;
        console.log("controlSubstring:",controlSubstring);
        const publicKeyEncoded = openDsuCrypto.encodeBase58(publicKeyRaw);
        let prefixedPublicKey = require("../../ApiAdaptor/controllers/addAnchor").getPublicKeyForSmartContract(publicKeyEncoded);

        //handle signature

        let valueToHash = anchorID+newHashLinkSSI+zkpValue;

        let signature65 = getSignature(seedSSI,valueToHash,newHashLinkSSI,zkpValue,lastHashLinkSSI,publicKeyEncoded);


        let result = await anchorContract.methods.addAnchor(anchorID, keySSIType, controlSubstring,
            versionNumber, newHashLinkSSI, zkpValue, lastHashLinkSSI,
            signature65, prefixedPublicKey).send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result.events.InvokeStatus.returnValues.statusCode, 200);

        newHashLinkSSI = "hashLinkSSI2";
        lastHashLinkSSI = "hashLinkSSI1";

        //assume control string empty as ConstSSI
        controlSubstring = "0x00";
        signature65 = "0x00";
        prefixedPublicKey = "0x00";

        result = await anchorContract.methods.addAnchor(anchorID, keySSIType, controlSubstring,
            versionNumber, newHashLinkSSI, zkpValue, lastHashLinkSSI,
            signature65, prefixedPublicKey).send({
            from: accounts[0],
            gas: 3000000
        });

        //it will fail to controlstring validation
        assert.equal(result.events.InvokeStatus.returnValues.statusCode, 102);
    });

    if ('invalid signature will not be accepted', async () => {
        const seedSSI = openDSURequire("opendsu").loadApi("keyssi").buildSeedSSI('default', 'teststring', 'control', 'v0', 'hint');
        const publicKeyRaw = seedSSI.getPublicKey("raw");
        const anchorID = seedSSI.getAnchorId();
        let newHashLinkSSI = "hashLinkSSI1";
        let lastHashLinkSSI = "hashLinkSSI1";

        const openDsuUtils = require('../../ApiAdaptor/utils/opendsuutils');
        const keySSI = Buffer.from(openDsuUtils.decodeBase58(anchorID)).toString().split(':');
        let controlSubstring = Buffer.from(openDsuUtils.decodeBase58(keySSI[4])).toString('hex');
        const versionNumber = keySSI[5];
        const keySSIType = keySSI[1];
        const zkpValue = "zkp";

        const openDsuCrypto = openDSURequire("opendsu").loadApi("crypto");

        //prepare for smartcontract
        controlSubstring = '0x'+controlSubstring;
        console.log("controlSubstring:",controlSubstring);
        const publicKeyEncoded = openDsuCrypto.encodeBase58(publicKeyRaw);
        let prefixedPublicKey = require("../../ApiAdaptor/controllers/addAnchor").getPublicKeyForSmartContract(publicKeyEncoded);

        //handle signature

        //build wrong hash to obtain a wrong signature
        let valueToHash = anchorID+newHashLinkSSI+zkpValue+lastHashLinkSSI;
        let signature65 = getSignature(seedSSI,valueToHash,newHashLinkSSI,zkpValue,lastHashLinkSSI,publicKeyEncoded);


        result = await anchorContract.methods.addAnchor(anchorID, keySSIType, controlSubstring,
            versionNumber, newHashLinkSSI, zkpValue, lastHashLinkSSI,
            signature65, prefixedPublicKey).send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result.events.InvokeStatus.returnValues.statusCode, 103);

        //try with empty signature
        result = await anchorContract.methods.addAnchor(anchorID, keySSIType, controlSubstring,
            versionNumber, newHashLinkSSI, zkpValue, lastHashLinkSSI,
            "0x00", prefixedPublicKey).send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result.events.InvokeStatus.returnValues.statusCode, 103);
    });

});



function getSignature(seedSSI,valueToHash,newHashLinkSSI,zkpValue,lastHashLinkSSI,publicKeyEncoded){
    const openDsuCrypto = openDSURequire("opendsu").loadApi("crypto");
    const anchorID = seedSSI.getAnchorId();

    const privateKeyPem = seedSSI.getPrivateKey("pem");
    const sign = require("crypto").createSign("sha256");
    sign.update(valueToHash);
    const signature = sign.sign(privateKeyPem);
    const encodedSignatureDer = openDsuCrypto.encodeBase58(signature);
    const signature65 = require("../../ApiAdaptor/controllers/addAnchor").getSignatureForSmartContract(encodedSignatureDer,anchorID,
        newHashLinkSSI,zkpValue,lastHashLinkSSI,publicKeyEncoded);

    return signature65;
}
