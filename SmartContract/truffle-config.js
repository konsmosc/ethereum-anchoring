

module.exports = {
  

  networks: {
    internal: {
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas: 4712388,
      gasPrice: 300000,
      from: "0xA30187C06F27AE9AB5334d3546ed23269684263C",

    },
    development: {
      host: "172.20.119.173",
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
