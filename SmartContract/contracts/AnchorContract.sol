pragma solidity >= 0.5.0 <= 0.7.4;
pragma experimental ABIEncoderV2;

contract AnchorContract {

    event InvokeStatus(uint indexed statusCode);

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
            int validateAnchorContinuityResult = validateAnchorContinuity(anchorID, lastHashLinkSSI, newHashLinkSSI);
            if (validateAnchorContinuityResult == 0)
            {
                //hash link are out of sync
                emit InvokeStatus(100);
                return;
            }

            if (validateAnchorContinuityResult == -1)
            {
                //anchor is new and we must check controlString
                if (isStringEmpty(controlString))
                {
                    emit InvokeStatus(101);
                    return;
                }
            }



            //create new anchor value
            AnchorValue memory anchorValue = buildAnchorValue(newHashLinkSSI,lastHashLinkSSI,ZKPValue);
            anchorStorage.push(anchorValue);
            uint versionIndex = anchorStorage.length - 1;
            //update number of versions available for that anchor
            anchorVersions[anchorID].push(versionIndex);
            //all done, invoke ok status
            emit InvokeStatus(200);
    }

    function isStringEmpty(string memory data) private pure returns (bool)
    {
        bytes memory bdata = bytes(data);
        if (bdata.length == 0)
        {
            return true;
        }
        return false;
    }

    function validateAnchorContinuity(string memory anchorID, string memory lastHashLinkSSI, string memory newHashLinkSSI) private view returns (int)
    {
        if (anchorVersions[anchorID].length == 0)
        {
            //first anchor to be added
            return -1;
        }
        uint index = anchorVersions[anchorID][anchorVersions[anchorID].length-1];

        //can import StringUtils contract or compare hashes
        //hash compare seems faster
        if (sha256(bytes(anchorStorage[index].hash.newHashLinkSSI)) == sha256(bytes(lastHashLinkSSI)))
        {
            //ensure we dont get double hashLinkSSI
            if (sha256(bytes(newHashLinkSSI)) == sha256(bytes(lastHashLinkSSI)))
            {
                //raise out of sync. the hashlinks should be different, except 1st anchor
                return 0;
            }
            //last hash link from contract is a match with the one passed
            return 1;
        }
        //hash link is out of sync. the last hash link stored doesnt match with the last hash link passed
        return 0;
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