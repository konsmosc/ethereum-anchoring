const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());


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
            "signature", "publicKey").send({
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
            "signature", "publicKey").send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result.events.InvokeStatus.returnValues.statusCode, 200);

        const result2 = await anchorContract.methods.addAnchor("anchorID1", "keySSIType", "controlString",
            "vn", "newHashLinkSSI", "ZKPValue", "lastHashLinkSSI",
            "signature", "publicKey").send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result2.events.InvokeStatus.returnValues.statusCode, 100);
    });

    it('anchor versions in sync for the same anchorID can be commited', async() => {
        const result = await anchorContract.methods.addAnchor("anchorID1", "keySSIType", "controlString",
            "vn", "newHashLinkSSI", "ZKPValue", "lastHashLinkSSI",
            "signature", "publicKey").send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result.events.InvokeStatus.returnValues.statusCode, 200);

        const result2 = await anchorContract.methods.addAnchor("anchorID1", "keySSIType", "controlString",
            "vn", "newHashLinkSSI1", "ZKPValue", "newHashLinkSSI",
            "signature", "publicKey").send({
            from: accounts[0],
            gas: 3000000
        });

        assert.equal(result2.events.InvokeStatus.returnValues.statusCode, 200);
    })
});