function getVersions(anchorFactory, anchorID, callback) {

    anchorFactory.methods.getAnchorVersions(anchorID).call().then((f) => {
        console.log('finished get anchors :', anchorID, f);
        const anchors = [];
        for (let i = 0; i < f.length; i++) {
            anchors.push(f[i].hash.newHashLinkSSI);

        }

        callback(null, anchors);
    }).catch(err => {
        console.log(err);
        callback(err, null);
    });
}


module.exports = getVersions;