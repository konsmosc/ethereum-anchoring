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
    mapping (string => string) anchorControlStrings;



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
                emit InvokeStatus(statusHashLinkOutOfSync);
                return;
            }

            if (validateAnchorContinuityResult == -1)
            {
                //anchor is new and we must check controlString
                if (isStringEmpty(controlString))
                {
                    emit InvokeStatus(statusControlStringEmptyOnNewAnchor);
                    return;
                }
                // add controlString to the mapping
                anchorControlStrings[anchorID] = controlString;
            }

            //validate hash of the publicKey
            if (validatePublicKeyHash(publicKey,anchorID) == -1)
            {
                emit InvokeStatus(statusHashOfPublicKeyDoesntMatchControlString);
                return;
            }

            //validate signature
            if (validateHashSignature(anchorID, newHashLinkSSI,ZKPValue,lastHashLinkSSI, signature) == -1)
            {
                emit InvokeStatus(statusSignatureCheckFailed);
                return;
            }

            //create new anchor value
            AnchorValue memory anchorValue = buildAnchorValue(newHashLinkSSI,lastHashLinkSSI,ZKPValue);
            anchorStorage.push(anchorValue);
            uint versionIndex = anchorStorage.length - 1;
            //update number of versions available for that anchor
            anchorVersions[anchorID].push(versionIndex);

            //all done, invoke ok status
            emit InvokeStatus(statusOK);
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




    function validatePublicKeyHash(string memory publicKey, string memory anchorID) private returns (int)
    {
        string memory controlString =  anchorControlStrings[anchorID];
        if (sha256(bytes(publicKey)) == sha256(bytes(controlString)))
        {
            //we have match. All is ok.
            return 1;
        }

        //validation failed
        return 0;
    }

    function recover(bytes32 hash, bytes memory signature) public pure returns (address)
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

   // function verifySignature() public pure returns (bool) {
   //     bytes32 message = 0x2b350a58f723b94ef3992ad0d3046f2398aef2fe117dc3a36737fb29df4a706a;
   //     bytes memory sig = hex"e6ca6508de09cbb639216743721076bc8beb7bb45e796e0e3422872f9f0fcd362e693be7ca40e2123dd1efaf71ebb94d38052458281ad3b69ec8977c8294928400";
   //     address addr = 0x8e6a1f13a9c6b9443fea4393291308ac4c965b69;
//
 //       return recover(message, sig) == addr;
  //  }

    function validateSignature(string memory anchorID,string memory newHashLinkSSI,string memory ZKPValue,
        string memory lastHashLinkSSI, string memory signature, string memory publicKey) public returns (bool)
    {
        return getAddressFromPublicKey(bytes(publicKey)) == uint256(getAddressFromHashAndSig(anchorID, newHashLinkSSI, ZKPValue, lastHashLinkSSI, signature));
    }

    function getAddressFromPublicKey(bytes memory publicKey) public returns (uint256){
        return (uint(sha256(publicKey)) & 0x00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF);
    }

    function getAddressFromHashAndSig(string memory anchorID,string memory newHashLinkSSI,string memory ZKPValue,
        string memory lastHashLinkSSI, string memory signature) public returns (address)
    {
        //return the public key derivation
        return recover(getHashToBeChecked(anchorID,newHashLinkSSI,ZKPValue,lastHashLinkSSI), bytes(signature));
    }

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

    function validateHashSignature(string memory anchorID,string memory newHashLinkSSI,string memory ZKPValue,
        string memory lastHashLinkSSI,string memory signature) private returns (int)
    {
        bytes memory hash;
        if (anchorVersions[anchorID].length == 0)
        {
            hash = abi.encode(anchorID,newHashLinkSSI,ZKPValue);
        }else{
            hash = abi.encode(anchorID,newHashLinkSSI,ZKPValue,lastHashLinkSSI);
        }
        // call some function with the hash and the signature
        // below is how to extract r,s,v from signature
        //signature = signature.substr(2); //remove 0x
        //const r = '0x' + signature.slice(0, 64)
        //const s = '0x' + signature.slice(64, 128)
        //const v = '0x' + signature.slice(128, 130)
        //const v_decimal = web3.toDecimal(v)

        // the output of the function is the public key that we get. If is match, the input is valid, otherwise we emit error and stop.

        //solidity - ecrecover function
        //ecrecover(bytes32 hash, uint8 v, bytes32 r, bytes32 s) returns
        //(address): recover the address associated with the public key from
        //elliptic curve signature or return zero on error
        //address is a derivation from the publickey
        // example of derivation publickey -> address (the address is not paybale)
        //function checkPubKey(bytes pubkey) constant returns (bool){
        //    return (uint(keccak256(pubkey)) & 0x00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF) == uint(msg.sender);
        //}

        //so we could use:
        //function checkPubKey(bytes pubkey, bytes addressGotFromSignatureCheck) constant returns (bool){
        //         return (uint(keccak256(pubkey)) & 0x00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF) == uint(addressGotFromSignatureCheck);
        //        }

        // we get address :
        // addressGotFromSignatureCheck = ecrecover(hash,v,r,s);
        return 1;
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

}