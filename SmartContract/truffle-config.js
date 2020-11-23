const truffleConfig = {


  networks: {
    internal: {
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas: 4712388,
      gasPrice: 300000,
      from: "0x85Eb50fd4f27A5c9E4430a6840722cDa9BB2b358",

    },
    development: {
      host: "172.20.2.141",
      port: 8545,
      network_id: "*",
      gas: 4712388,
      gasPrice: 0,
      from: "0x66d66805E29EaB59901f8B7c4CAE0E38aF31cb0e",
      password: "lst7upm",
      type: "quorum"
    }

  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      // version: "0.5.1",    // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      // settings: {          // See the solidity docs for advice about optimization and evmVersion
      //  optimizer: {
      //    enabled: false,
      //    runs: 200
      //  },
      //  evmVersion: "byzantium"
      // }
    },
  },
};

if (typeof process.env.DEV_MODE !== "undefined")
{
  console.log('Using .env file for environment variables');
  require('dotenv').config();
}
else {
  console.log('Using environment variables defined by context. Eg. existing context or context set in yaml file.');
}

function getTruffleConfiguration() {
  if (typeof process.env.ACCOUNT !== "undefined")
  {
    console.log('Using env ACCOUNT : ', process.env.ACCOUNT);
    truffleConfig.networks.internal.from =  process.env.ACCOUNT;
    truffleConfig.networks.development.from =  process.env.ACCOUNT;
  }
  if (typeof process.env.RPC_HOST !== "undefined")
  {
    console.log('Using env RPC_HOST : ', process.env.RPC_HOST);
    truffleConfig.networks.internal.host =  process.env.RPC_HOST;
    truffleConfig.networks.development.host =  process.env.RPC_HOST;
  }
  return truffleConfig;
}

module.exports = getTruffleConfiguration();
