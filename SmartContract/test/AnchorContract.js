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

    it('can add anchor and get it\'s version back', async () => {


        const result = await anchorContract.methods.addAnchor("anchorID1", "keySSIType", "0x0AA0",
            "vn", "newHashLinkSSI", "ZKPValue", "lastHashLinkSSI",
            "0x00AA", "0x00AA").send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result.events.InvokeStatus.returnValues.statusCode, 200);

        const anchors = await anchorContract.methods.getAnchorVersions("anchorID1").call();

        assert.equal(anchors[0].ZKPValue, "ZKPValue");
        assert.equal(anchors[0].hash.newHashLinkSSI, "newHashLinkSSI");
        assert.equal(anchors[0].hash.lastHashLinkSSI, "lastHashLinkSSI");
        assert.equal(anchors.length, 1);

    });

    it('anchor versions for the same anchorID must be in sync in order to be comited', async() => {
        const result = await anchorContract.methods.addAnchor("anchorID1", "keySSIType", "0x0AA0",
            "vn", "newHashLinkSSI", "ZKPValue", "lastHashLinkSSI",
            "0x00AA", "0x00AA").send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result.events.InvokeStatus.returnValues.statusCode, 200);

        const result2 = await anchorContract.methods.addAnchor("anchorID1", "keySSIType", "0x0AA0",
            "vn", "newHashLinkSSI", "ZKPValue", "lastHashLinkSSI",
            "0x00AA", "0x00AA").send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result2.events.InvokeStatus.returnValues.statusCode, 100);
    });

    it('anchor versions in sync for the same anchorID can be commited', async() => {
        const result = await anchorContract.methods.addAnchor("anchorID1", "keySSIType", "0x0AA0",
            "vn", "newHashLinkSSI", "ZKPValue", "lastHashLinkSSI",
            "0x00AA", "0x00AA").send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result.events.InvokeStatus.returnValues.statusCode, 200);

        const result2 = await anchorContract.methods.addAnchor("anchorID1", "keySSIType", "0xAA0",
            "vn", "newHashLinkSSI1", "ZKPValue", "newHashLinkSSI",
            "0x00AA", "0x00AA").send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result2.events.InvokeStatus.returnValues.statusCode, 200);


    });

    it ('check hash opendsu == solidity', async () => {
        // generate private and public key using OpenDSU
        const seedSSI = openDSURequire("opendsu").loadApi("keyssi").buildSeedSSI('default', 'teststring', 'control', 'v0', 'hint');
        const strToBeHashed = "anchorId"+"newHashLinkSSI"+"ZKPValue";

        const openDsuCrypto = openDSURequire("opendsu").loadApi("crypto");
        const base58encodedHash = openDsuCrypto.sha256(strToBeHashed);
        //decode the hash
        const hashDecoded = openDsuCrypto.decode(seedSSI, base58encodedHash).toString('hex');
        const hashFromSolidity = await anchorContract.methods.getHashToBeChecked("anchorId","newHashLinkSSI","ZKPValue","lastHashLinkSSI").call();

        assert.strictEqual('0x'+hashDecoded, hashFromSolidity);
    });

    it ('check signature of the hash produced by OPENDSU using sign from ETHERIUM library is accepted by smart contract ', async () => {
        // generate private and public key using OpenDSU

        const seedSSI = openDSURequire("opendsu").loadApi("keyssi").buildSeedSSI('default', 'teststring', 'control', 'v0', 'hint');
        const privateKeyPem = seedSSI.getPrivateKey("pem");
        const privateKeyRaw = seedSSI.getPrivateKey("raw");
        const publicKeyRaw = seedSSI.getPublicKey("raw");

        const keyObj = {
            key: privateKeyPem
        };
        keyObj.dsaEncoding = 'ieee-p1363';
        const strToBeHashed = "anchorId"+"newHashLinkSSI"+"ZKPValue";

        const openDsuCrypto = openDSURequire("opendsu").loadApi("crypto");
        const base58encodedHash = openDsuCrypto.sha256(strToBeHashed);
        //decode the hash
        const hashDecoded = openDsuCrypto.decode(seedSSI, base58encodedHash).toString('hex');


        //use crypto sign until is implemented in opendsu for {r,s} sign format
        const sign = require("crypto").createSign("sha256");
        sign.update(hashDecoded);
        const signature = sign.sign(keyObj);

        console.log('signature from crypto node js module : ',signature);
        console.log('signature from crypto node js module :',signature.toString('hex'));

        //use crypto sign until is implemented in opendsu for {r,s} sign format
        const sign1 = require("crypto").createSign("sha256");
        sign1.update(hashDecoded);
        const signature1 = sign1.sign(privateKeyPem);

        console.log('signature1 from crypto node js module : ',signature1);
        console.log('signature1 from crypto node js module :',signature1.toString('hex'));

        //use crypto sign until is implemented in opendsu for {r,s} sign format
        const {subtle} = require("@trust/webcrypto");
        const sigweb = await subtle.sign({name:'ECDSA'},privateKeyPem,hashDecoded);


        console.log('sigweb from crypto node js module : ',sigweb);
        console.log('sigweb from crypto node js module :',sigweb.toString('hex'));

        //sign the hash using ethers library
        const eth = require('ethers');
        const hexPrivateKey = "0x"+privateKeyRaw.toString('hex');
        const signingKey = new eth.utils.SigningKey(hexPrivateKey);

        //decode hash from open dsu
        const strIntoDigest = openDsuCrypto.decode(seedSSI, base58encodedHash)
        //sign the obtained hash using ethereum library
        const signatureEth = signingKey.signDigest(strIntoDigest);
        console.log(signatureEth);
        //build the signature by join
        const signatureJoinedEth = eth.utils.joinSignature(signatureEth);
        console.log('signatureJoinedEth : ', signatureJoinedEth);
        const recoveredEthAddress = eth.utils.recoverAddress(strIntoDigest,signatureJoinedEth);
        console.log('eth recoveredEthAddress : ', recoveredEthAddress);


        const ethereumAddressFromEthSign = await anchorContract.methods.getAddressFromHashAndSig("anchorId","newHashLinkSSI","ZKPValue","lastHashLinkSSI",signatureJoinedEth).call();
        console.log('ethereumAddress using sign from eth : ',ethereumAddressFromEthSign);
        const solidityEthereumAdressFromPublicKey = await anchorContract.methods.calculateAddress(publicKeyRaw).call();
        console.log('solidityEthereumAdressFromPublicKey : ',solidityEthereumAdressFromPublicKey);

        const signatureValidated = await anchorContract.methods.validateSignature("anchorId","newHashLinkSSI","ZKPValue","lastHashLinkSSI",signatureJoinedEth,publicKeyRaw).call();


        assert.strictEqual(ethereumAddressFromEthSign, solidityEthereumAdressFromPublicKey);
        assert.strictEqual(signatureValidated, true);
    });
    it ('check control string', async () => {
        // generate private and public key using OpenDSU
        const seedSSI = openDSURequire("opendsu").loadApi("keyssi").buildSeedSSI('default', 'teststring', 'control', 'v0', 'hint');
        const publicKeyRaw = seedSSI.getPublicKey("raw");

        const openDsuCrypto = openDSURequire("opendsu").loadApi("crypto");
        const base58encodedHash = openDsuCrypto.sha256(publicKeyRaw);
        //decode the hash
        const hashDecoded = openDsuCrypto.decode(seedSSI, base58encodedHash).toString('hex');
        //NOTE : in node js we can have hex strings. If prefixed with 0x, they can be send as bytes32 to solidity
        const result = await anchorContract.methods.validatePublicKeyAndControlString(publicKeyRaw,'0x'+hashDecoded).call();
        assert.strictEqual(result, true);


    });
    it ('fast test', async () => {
        const signature = "0x28a2db35a02f1825674cbac0ec013149c8221bacd48bc84dc0b912e77e94997786c5a76b095fcc5072e1e11bddb7b1c0d22619f8c0cc0bb28e9c9c43e09fcf191b";
        const valtohash = "3JstiXPDGd8K9TH1QbEz1x5Gj7CkQoNsMy4s8ZomirJMJDewo8PYRWVEHJXhY6UznwkDwRhTJJxDUFmg6WS3XT2XXLEXhruFmBh7kmca4v7ujNQLKyWJ8QNQ44P1wSsa3g2jRxf7wHMKnCADtXkaDxybigkuUCicpTgkqCNkE2p1nw";
        const pubKey = "R2RhcroaqARWBw8Pbe3rj31bTmeaVhSX9zA3cwrwZEtns3HpErTf41QF5NEACs5ZDhWHD3v7hoYireMTtMq8ht9G"; //encoded
        const anchorid = '3JstiXPDGd8K9TH1QbEz1x5Gj7CkQoNsMy4s8ZomirJMJDewo8PYRWVEHJXhY6UznwkDwRhTJJxDUFmg6WS3XT2X';
        const newhashlink = 'XLEXhruFmBh7kmca4v7ujNQLKyWJ8QNQ44P1wSsa3g2jRxf7wHMKnCADtXkaDxybigkuUCicpTgkqCNkE2p1nw';
        //const or =

        //or.enableForEnvironment(or.constants.NODEJS_ENVIRONMENT_TYPE);
        //end open dsu

        const openDsuCrypto = openDSURequire("opendsu").loadApi("crypto");
        const publicKeyRaw = openDsuCrypto.decodeBase58(pubKey);



        const ethereumAddressFromEthSign = await anchorContract.methods.getAddressFromHashAndSig(anchorid,newhashlink,"","",
            signature).call();
        console.log('fast test || ethereumAddress using sign from eth : ',ethereumAddressFromEthSign);
        const solidityEthereumAdressFromPublicKey = await anchorContract.methods.calculateAddress(publicKeyRaw).call();
        console.log('fast test || solidityEthereumAdressFromPublicKey : ',solidityEthereumAdressFromPublicKey);

        const signatureValidated = await anchorContract.methods.validateSignature(anchorid,newhashlink,"","",
            signature,publicKeyRaw).call();


        assert.strictEqual(ethereumAddressFromEthSign, solidityEthereumAdressFromPublicKey);
        assert.strictEqual(signatureValidated, true);
    });
    it ('TODO : check signature from opendsu is accepted by smart contract', async ( )=> {

        //todo : implement

    });

    it ('check read only anchor', async () => {
        // read only anchors ignore every control field
        //can add only one
        const result = await anchorContract.methods.addAnchor("anchorID", "keySSIType", "0x",
            "vn", "newHashLinkSSI", "ZKPValue", "lastHashLinkSSI",
            "0x", "0x").send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result.events.InvokeStatus.returnValues.statusCode, 200);

        const result2 = await anchorContract.methods.addAnchor("anchorID", "keySSIType", "0x",
            "vn", "newHashLinkSSI", "ZKPValue", "lastHashLinkSSI",
            "0x", "0x").send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result2.events.InvokeStatus.returnValues.statusCode, 101);
    })
});




