function createGetVersionsHandler(anchorFactory) {
    return function (request, response, next) {

        const anchorID = request.params.keySSI;

        require("../anchoring/getVersionsAnchorSmartContract")(anchorFactory.contract, anchorID, (err, result) => {
            if (err) {
                console.log("response getAnchorVersions 500", anchorID);
                return response.status(500).send(err);
            }
            console.log("response getAnchorVersions 200", anchorID, result);
            return response.status(200).send(JSON.stringify(result));
        });
    }
}

module.exports = createGetVersionsHandler;