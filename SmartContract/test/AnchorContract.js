const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());

//opendsu
require("../../../privatesky/psknode/bundles/openDSU");
const or = openDSURequire('overwrite-require');
or.enableForEnvironment(or.constants.NODEJS_ENVIRONMENT_TYPE);
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


        const result = await anchorContract.methods.addAnchor("anchorID1", "keySSIType", "controlString",
            "vn", "newHashLinkSSI", "ZKPValue", "lastHashLinkSSI",
            Buffer.from("signature"), Buffer.from("publicKey")).send({
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
        const result = await anchorContract.methods.addAnchor("anchorID1", "keySSIType", "controlString",
            "vn", "newHashLinkSSI", "ZKPValue", "lastHashLinkSSI",
            Buffer.from("signature"), Buffer.from("publicKey")).send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result.events.InvokeStatus.returnValues.statusCode, 200);

        const result2 = await anchorContract.methods.addAnchor("anchorID1", "keySSIType", "controlString",
            "vn", "newHashLinkSSI", "ZKPValue", "lastHashLinkSSI",
            Buffer.from("signature"), Buffer.from("publicKey")).send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result2.events.InvokeStatus.returnValues.statusCode, 100);
    });

    it('anchor versions in sync for the same anchorID can be commited', async() => {
        const result = await anchorContract.methods.addAnchor("anchorID1", "keySSIType", "controlString",
            "vn", "newHashLinkSSI", "ZKPValue", "lastHashLinkSSI",
            Buffer.from("signature"), Buffer.from("publicKey")).send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result.events.InvokeStatus.returnValues.statusCode, 200);

        const result2 = await anchorContract.methods.addAnchor("anchorID1", "keySSIType", "controlString",
            "vn", "newHashLinkSSI1", "ZKPValue", "newHashLinkSSI",
            Buffer.from("signature"), Buffer.from("publicKey")).send({
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
        const result = await anchorContract.methods.validatePublicKeyAndControlString(publicKeyRaw,'0x'+hashDecoded).call();
        console.log('validatePublicKeyHash : ', result);
        console.log('hash of pub key : ', hashDecoded);
        const v1 = await anchorContract.methods.v1(publicKeyRaw).call();
        console.log('v1 : ', v1);
        const v2 = await anchorContract.methods.v2('0x'+hashDecoded).call();
        console.log('v2 : ', v2);
    });
    it ('TODO : check signature from opendsu is accepted by smart contract', async ( )=> {

        //todo : implement
        //build variants
        /*const b1c = Buffer.from('1c','hex');
        const b1b = Buffer.from('1b','hex');
        const arrb1b = [signature,b1b];
        const arrb1c = [signature,b1c];
        const signature1c = Buffer.concat(arrb1c);
        const signature1b = Buffer.concat(arrb1b);*/
    });

    it ('check', async () => {
        return;
        //const cryptonodeJS = require("crypto");
    //    const privateKey = 0xeddbdc1168f1daeadbd3e44c1e3f8f5a284c2029f78ad26af98583a499de5b19n;


     //   require("../../../privatesky/psknode/bundles/openDSU");
        //require = openDSURequire;
       // const or = openDSURequire('overwrite-require');
        //or.enableForEnvironment(or.constants.NODEJS_ENVIRONMENT_TYPE);

        //console.log(crypto);
        /*const hash = crypto.sha256(strToBeHashed);
        console.log(hash);
        const hexhashstr = crypto.decode(seedSSI,hash).toString("hex");
        console.log(crypto.decode(seedSSI,hash).toString("hex"));
        crypto.sign(seedSSI,hash, (err, data) =>{
            const signature = data;
            console.log(signature);
        });
        crypto.sign(seedSSI,hexhashstr, (err, data) =>{
            const signature = data;
            console.log(signature);
        });
        crypto.sign(seedSSI,crypto.decode(seedSSI,hash), (err, data) =>{
            const signature = data;
            console.log(signature);
        });*/


        const seedSSI = openDSURequire("opendsu").loadApi("keyssi").buildSeedSSI('default', 'teststring', 'control', 'v0', 'hint');
        const p1 = seedSSI.getPrivateKey("pem");
        const pk = seedSSI.getPrivateKey("raw");
        console.log("private key. Pem format. seedSSI.getPrivateKey(\"pem\") \n",p1);
        const publicKey = seedSSI.getPublicKey("raw");
        console.log(publicKey);

        dd(p1, publicKey,pk.toString('hex'));

        /*const crypto = require("opendsu").loadApi("crypto");

        crypto.sign(seedSSI, strBuffer,  (err, data) => {
            const signature = data;
            console.log("signature : ",signature);
            console.log("signature len : ",signature.length);
            //console.log("signature len : ",signature.toString("hex").length);
            crypto.verifySignature(seedSSI,strBuffer,signature,seedSSI.getPublicKey(),(err, data) => {
                console.log('verify sign :', data);
            });
            anchorContract.methods.validateSignature("anchorId","newHashLinkSSI","ZKPValue","lastHashLinkSSI",signature,publicKey).call().then((f) =>{
                console.log(f);
            });

            anchorContract.methods.getAddressFromPublicKey(publicKey).call().then( (f) => {
                console.log("adress from public key : ",f);
            });

            anchorContract.methods.getAddressFromHashAndSig("anchorId","newHashLinkSSI","ZKPValue","lastHashLinkSSI",signature).call().then( (f) => {
                console.log("address recovery from hash and public key : ",f);
            });


        });

*/
       // const c = require("../opendsu/opendsu.js").loadApi("crypto");
       // require('../opendsu/opendsu');
      //  const openDSU = require("opendsu").loadApi("crypto");
       // const keySSISpace = openDSU.createECKeyGenerator().getPublicKey(privateKey);
            //.loadApi('keyssi');
       // const seedSSI = keySSISpace.buildSeedSSI('default', 'some string', 'control', 'v0', 'hint');

        //console.log(keySSISpace);
        /*const hash = require("crypto")
            .createHash("sha256")
            .update(strToBeHashed)
            .digest("hex");*/

        //decode din base58 : public key get raw
        //: gen pair pub/private
        // generate sha256(hex)
        // get signature ( public key, hash, ...)
        // exec smart contract :  const result = await anchorContract.methods.validateSignature("anchorId","newHashLinkSSI","ZKPValue","lastHashLinkSSI",signature,publicKey).call();

        //const privateKey = 0xeddbdc1168f1daeadbd3e44c1e3f8f5a284c2029f78ad26af98583a499de5b19n;


      //  const publicKeyPoint = ecdsa.getPublicKeyPoint(privateKey);
       // const publicKey = ecdsa.publicKeyPoint2HexStr(publicKeyPoint);
      //  const hashBigInt = BigInt(`0x${hash}`);
       // const signature = ecdsa.sign(privateKey,hashBigInt);
       // console.log("publickey : ",publicKey);
       // console.log("signature : ",signature);
       // const result = await anchorContract.methods.validateSignature("anchorId","newHashLinkSSI","ZKPValue","lastHashLinkSSI",signature,publicKey).call();

        //console.log("result got from valid sig : ", result);


    })
});


function dd (p1, pubKey,privKey){



    const keyObj = {
        key: p1
    };
    keyObj.dsaEncoding = 'ieee-p1363';
    console.log(keyObj);
    const strToBeHashed = "anchorId"+"newHashLinkSSI"+"ZKPValue";


    const hash = require("crypto")
        .createHash("sha256")
        .update("\x19Ethereum Signed Message:\n"+strToBeHashed)
        .digest("hex");
    const strBuffer = Buffer.from(hash);


    const sign = require("crypto").createSign("sha256");
    sign.update(hash);
    const signature1 = sign.sign(keyObj);

    console.log(signature1.length, signature1);
    console.log('0x'+signature1.toString('hex'));
    /*const EC = require('elliptic').ec;
    // Create and initialize EC context
    // (better do it once and reuse it)
    var ec = new EC('secp256k1');
    var key = ec.keyFromPublic(pubKey, 'hex');
    var pubPoint = key.getPublic();
    console.log(pubPoint.getX(), pubPoint.getY());
    const hashpk = require("crypto")
        .createHash("sha256")
        .update(pubKey)
        .digest("hex");
    const x = hashpk & 0x00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    console.log("ethereum account : ", x, hashpk);
*/

    //var c = web3.eth.accounts.recover(hash,"0x"+signature1.toString('hex'),false);
    const eth = require('ethers')
    const hexPrivateKey = "0x"+privKey;
    const signingKey = new eth.utils.SigningKey(hexPrivateKey);
    console.log('signing key : ', signingKey);
    console.log("public key from keySSI : ", pubKey.toString('hex'));
    //const signature = signingKey.signDigest(eth.utils.id(hash));
    const strIntoDigest = eth.utils.id(strToBeHashed);
    console.log('string into digest : ', strIntoDigest);
    const signature = signingKey.signDigest(strIntoDigest);
    console.log(signature);
    const signaturej = eth.utils.joinSignature(signature);
    console.log('signature : ',signaturej);
    const c1 = eth.utils.verifyMessage(hash,'0x'+signature1.toString('hex')+'1c');
    console.log('1c : ',c1,'\n',BigInt(c1));
    const c2 = eth.utils.verifyMessage(hash,'0x'+signature1.toString('hex')+'1b');
    console.log('1b : ',c2,'\n',BigInt(c2));


    console.log('pub key from eth verify : ',eth.utils.verifyMessage(strToBeHashed,signaturej));
    console.log('recover eth address : ',eth.utils.recoverAddress(strIntoDigest,signaturej));
    console.log('recover public key : ',eth.utils.recoverPublicKey(strIntoDigest,signaturej));
    console.log('pub key from keySSI : ', pubKey.toString('hex'));

    const publicKeyToAddress = require('ethereum-public-key-to-address')
    console.log('Real account address from pubKey :',publicKeyToAddress(pubKey), BigInt(publicKeyToAddress(pubKey)),' end');
    anchorContract.methods.getAddressFromPublicKey(pubKey).call().then( (f) => {
        console.log("adress from public key : ",f, f.toString('hex'));
    });

    anchorContract.methods.getAddressFromHashAndSig("\x19Ethereum Signed Message:\nanchorId","newHashLinkSSI","ZKPValue","lastHashLinkSSI",signaturej).call().then( (f) => {
        console.log("address recovery from hash and public key : ",f);
    });


    anchorContract.methods.getAddressFromHashAndSig2(strIntoDigest.substr(2, strIntoDigest.length-2),signaturej).call().then( (f) => {
        console.log("2. address recovery from hash and public key : ",f);
    });
    anchorContract.methods.getAddressFromHashAndSig3(Buffer.from(strIntoDigest, 'hex'),signaturej).call().then( (f) => {
        console.log("3. address recovery from hash and public key : ",f);
    });

    anchorContract.methods.getAddressFromHashAndSig4().call().then( (f) => {
        console.log("|GOOD| 4. address recovery from hash and public key : ",f);
    });

    anchorContract.methods.verify2waydigest(strIntoDigest).call().then( (f) => {
        console.log("Digest Got : ",f,'\n Send : ',strIntoDigest);
    });

    anchorContract.methods.verify2waysignature(signaturej).call().then( (f) => {
        console.log("Signature Got : ",f ,'\n Send : ',signaturej);
    });


    console.log(pubKey.length, pubKey);
    anchorContract.methods.calculateAddress(pubKey).call().then( (f) => {
        console.log("|good code|Address Got : ",f ,'\n Send : ',pubKey);
    });
    anchorContract.methods.get64(pubKey).call().then( (f) => {
        console.log("|good code| Address Got64 : ",f ,'\n Send : ',pubKey);
    });
}

