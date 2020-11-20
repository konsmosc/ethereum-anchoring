pragma solidity >= 0.5.0 <= 0.7.4;
pragma experimental ABIEncoderV2;

contract AnchorContract {

    // error codes
    uint constant statusOK = 200;
    uint constant statusHashLinkOutOfSync = 100;
    uint constant statusControlStringEmptyOnNewAnchor = 101;
    uint constant statusHashOfPublicKeyDoesntMatchControlString = 102;
    uint constant statusSignatureCheckFailed = 103;

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

    //mapping between anchorID and controlString.
    mapping (string => bytes32) anchorControlStrings;



    constructor() public {


    }


    // public function
    function addAnchor(string memory anchorID, string memory keySSIType, bytes32 controlString,
        string memory vn, string memory newHashLinkSSI, string memory ZKPValue, string memory lastHashLinkSSI,
        bytes memory signature, bytes memory publicKey) public {
            //todo : implementa validation process
            //todo : add error management
            //todo : add new mapping between anchorID and controlString
            //todo : use controlString if is already defined for anchorID and ignore the parameter
            int validateAnchorContinuityResult = validateAnchorContinuity(anchorID, lastHashLinkSSI, newHashLinkSSI);
            if (validateAnchorContinuityResult == 0)
            {
                //hash link are out of sync
                emit InvokeStatus(statusHashLinkOutOfSync);
                return;
            }

            if (validateAnchorContinuityResult == -1)
            {
                //anchor is new and we must check controlString
                if (isEmptyBytes32(controlString))
                {
                    emit InvokeStatus(statusControlStringEmptyOnNewAnchor);
                    return;
                }
                // add controlString to the mapping
                anchorControlStrings[anchorID] = controlString;
            }

            //validate hash of the publicKey
            //todo : enable
            //if (validatePublicKeyHash(publicKey,anchorID) == -1)
            //{
                //emit InvokeStatus(statusHashOfPublicKeyDoesntMatchControlString);
                //return;
            //}

            //validate signature
            //todo : enable
            //if (!validateSignature(anchorID, newHashLinkSSI,ZKPValue,lastHashLinkSSI, signature,publicKey))
            //{
                //emit InvokeStatus(statusSignatureCheckFailed);
                //return;
            //}

            //create new anchor value
            AnchorValue memory anchorValue = buildAnchorValue(newHashLinkSSI,lastHashLinkSSI,ZKPValue);
            anchorStorage.push(anchorValue);
            uint versionIndex = anchorStorage.length - 1;
            //update number of versions available for that anchor
            anchorVersions[anchorID].push(versionIndex);

            //all done, invoke ok status
            emit InvokeStatus(statusOK);
    }




    function validatePublicKeyAndControlString(bytes memory publicKey,bytes32 controlString) public returns (bool)
    {
        return (sha256(publicKey) == controlString);
    }


    function validatePublicKeyHash(bytes memory publicKey, string memory anchorID) public returns (int)
    {
        bytes32 controlString =  anchorControlStrings[anchorID];
        if (validatePublicKeyAndControlString(publicKey,controlString))
        {
            //we have match. All is ok.
            return 1;
        }

        //validation failed
        return -1;
    }

    function recover(bytes32 hash, bytes memory signature) private pure returns (address)
    {
        bytes32 r;
        bytes32 s;
        uint8 v;

        // Check the signature length
        if (signature.length != 65) {
            return (address(0));
        }

        // Divide the signature in r, s and v variables
        // ecrecover takes the signature parameters, and the only way to get them
        // currently is to use assembly.
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        // Version of signature should be 27 or 28, but 0 and 1 are also possible versions
        if (v < 27) {
            v += 27;
        }

        // If the version is correct return the signer address
        if (v != 27 && v != 28) {
            return (address(0));
        } else {
            // solium-disable-next-line arg-overflow
            return ecrecover(hash, v, r, s);
        }
    }


    //this is a verification function exposed only to check the verification signature process
    //todo : for production change this function to private
    function validateSignature(string memory anchorID,string memory newHashLinkSSI,string memory ZKPValue,
        string memory lastHashLinkSSI, bytes memory signature, bytes memory publicKey) public returns (bool)
    {
        return calculateAddress(publicKey) == getAddressFromHashAndSig(anchorID, newHashLinkSSI, ZKPValue, lastHashLinkSSI, signature);
    }

    //this is a verification function exposed only to check the verification signature process
    //todo : for production change this function to private
    function calculateAddress(bytes memory pub) public pure returns (address addr) {
        // address is 65 bytes
        // lose the first byte 0x04, use only the 64 bytes
        // sha256 (64 bytes)
        // get the 20 bytes
        bytes memory pubk = get64(pub);

        bytes32 hash = keccak256(pubk);
        assembly {
            mstore(0, hash)
            addr := mload(0)
        }
    }

    //this is a verification function exposed only to check the verification signature process
    //todo : for production change this function to private
    function get64(bytes memory pub) public pure returns (bytes memory)
    {
        //format 0x04bytes32bytes32
        bytes32 first32;
        bytes32 second32;
        assembly {
            //intentional 0x04bytes32 -> bytes32. We drop 0x04
            first32 := mload(add(pub, 33))
            second32 := mload(add(pub, 65))
        }

        return abi.encodePacked(first32,second32);
    }

    //this is a verification function exposed only to check the verification signature process
    //todo : for production change this function to private
    function getAddressFromHashAndSig(string memory anchorID,string memory newHashLinkSSI,string memory ZKPValue,
        string memory lastHashLinkSSI, bytes memory signature) public returns (address)
    {
        //return the public key derivation
        return recover(getHashToBeChecked(anchorID,newHashLinkSSI,ZKPValue,lastHashLinkSSI), signature);
    }

    //this is a verification function exposed only to check the verification signature process
    //todo : for production change this function to private
    function getHashToBeChecked(string memory anchorID,string memory newHashLinkSSI,string memory ZKPValue,
        string memory lastHashLinkSSI) public view returns (bytes32)
    {
        //use abi.encodePacked to not pad the inputs
        if (anchorVersions[anchorID].length == 0)
        {
            return sha256(abi.encodePacked(anchorID,newHashLinkSSI,ZKPValue));
        }
            return sha256(abi.encodePacked(anchorID,newHashLinkSSI,ZKPValue,lastHashLinkSSI));
    }

    function validateAnchorContinuity(string memory anchorID, string memory lastHashLinkSSI, string memory newHashLinkSSI) private returns (int)
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


    //utility functions

    function isEmptyBytes32(bytes32 data) public pure returns (bool)
    {
        return data[0] == 0;
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


    function stringToBytes32(string memory source) private pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(source, 32))
        }
    }
}