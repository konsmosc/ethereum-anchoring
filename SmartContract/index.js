const express = require('express');
const port = process.env.PORT === undefined ? 5000 : process.env.PORT;

const webServer = express();


configureHeaders(webServer);
configureEntryPoints(webServer);

webServer.listen(port);
console.log('Listening to port ', port);

function configureEntryPoints(webServer) {


    webServer.get("/contractAddress", getcontractAddress);
    console.log('GET /contractAddress');
    webServer.get("/abi", getabi);
    console.log('GET /abi');

    function getcontractAddress(request, response, next){
        try {
            const result = require('fs').readFileSync('external/smartcontractaddress.txt');
            const bodyResponse = JSON.stringify({contractAddress : result.toString()});
            console.log('-------------------------------------------------------------');
            console.log('response for /contractAddress GET');
            console.log(bodyResponse);
            console.log('response end for /contractAddress GET');
            console.log('-------------------------------------------------------------');
            return response.status(200).send(bodyResponse);
        } catch(err)
        {
            return response.status(500).send({Err : err});
        }

    }


    function getabi(result, response, next){
        try {
            const result = require('fs').readFileSync('build/contracts/AnchorContract.json');
            const jsonResult = JSON.parse(result);
            const bodyResponse = JSON.stringify({abi : jsonResult.abi});
            console.log('-------------------------------------------------------------');
            console.log('response for /abi GET');
            console.log(bodyResponse);
            console.log('response end for /abi GET');
            console.log('-------------------------------------------------------------');
            return response.status(200).send(bodyResponse);
        } catch(err)
        {
            return response.status(500).send({Err : err});
        }
    }
}

function configureHeaders(webServer) {
    webServer.use(function (req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        // Request headers you wish to allow
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Content-Length, X-Content-Length');
        res.setHeader('Access-Control-Allow-Origin', '*');
        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        // Request headers you wish to allow
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Content-Length, X-Content-Length');
        next();
    });

}

