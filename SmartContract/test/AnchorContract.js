const AnchorContract = artifacts.require("AnchorContract");

contract("AnchorContract", function(accounts) {

    let contractInstance;

    beforeEach(async () => {
       contractInstance = AnchorContract.new();
    });

    it("should add an anchor and read it" , () => {
            AnchorContract.deployed()
                .then(instance => instance.addAnchor("anchor", "hash1", "hash2", "dp", "zkp"))
                .then(instance => {
                    assert.equal(instance.getAnchorVersions("anchor").length, 1, "returned number of anchors is not 1");
                })
        }
    );

    it("should return no versions" , () => {
            return AnchorContract.deployed()
                      .then(instance => {
                          let versions = instance.getAnchorVersions("anchor2");
                          if (versions === undefined)
                          {
                              console.log("Got undefined as result from not found anchor");
                          }
                          else
                          {
                              assert.equal(0,1,"failed");
                          }

                })
        }
    );
});


