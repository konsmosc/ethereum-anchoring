pragma solidity >= 0.5.0 < 0.7.0;
pragma experimental ABIEncoderV2;

contract AnchorContract {

    struct AnchorHash {
        string newHashLinkSSI;
        string lastHashLinkSSI;
    }

    struct AnchorValue {
        AnchorHash hash;
        string ZKPValue;
    }

    // store all anchors
    AnchorValue[] anchorStorage;
    //keep a mapping between anchor(keySSI) and it's versions
    mapping (string => uint[]) anchorVersions;




    constructor() public {


    }

    // public function
    function addAnchor(string memory anchorID, string memory keySSIType, string memory controlString,
        string memory vn, string memory newHashLinkSSI, string memory ZKPValue, string memory lastHashLinkSSI,
        string memory signature, string memory publicKey) public {
            //todo : implementa validation process
            //todo : add error management
            //todo : add new mapping between anchorID and controlString
            //todo : use controlString if is already defined for anchorID and ignore the parameter
            //create new anchor value
            AnchorValue memory anchorValue = buildAnchorValue(newHashLinkSSI,lastHashLinkSSI,ZKPValue);
            anchorStorage.push(anchorValue);
            uint versionIndex = anchorStorage.length - 1;
            //update number of versions available for that anchor
            anchorVersions[anchorID].push(versionIndex);
    }

    function buildAnchorValue(string memory newHashLinkSSI, string memory lastHashLinkSSI, string memory ZKPValue) private pure returns (AnchorValue memory){
        AnchorHash memory anchorHash = AnchorHash(newHashLinkSSI, lastHashLinkSSI);
        return AnchorValue(anchorHash, ZKPValue);
    }

    function copyAnchorValue(AnchorValue memory anchorValue) private pure returns (AnchorValue memory){
        return buildAnchorValue(anchorValue.hash.newHashLinkSSI, anchorValue.hash.lastHashLinkSSI, anchorValue.ZKPValue);
    }

    // public function
    function getAnchorVersions(string memory anchor) public view returns (AnchorValue[] memory) {
        if (anchorVersions[anchor].length == 0)
        {
            return new AnchorValue[](0);
        }
        uint[] memory indexList = anchorVersions[anchor];
        AnchorValue[] memory result = new AnchorValue[] (indexList.length);
        for (uint i=0;i<indexList.length;i++){
            result[i] = copyAnchorValue(anchorStorage[indexList[i]]);
        }

        return result;
    }

}