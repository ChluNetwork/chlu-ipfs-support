#!/usr/bin/env node
const ChluIPFS = require('../dist/ChluIPFS.min.js');

let serviceNode = null;

function main(){
    console.log('Starting Chlu IPFS Service Node');
    serviceNode = new ChluIPFS({ type: ChluIPFS.types.service });
    return serviceNode.start();
}

main().then(() => console.log('Service Node Started'));

process.on('SIGINT', function() {
    console.log('Stopping gracefully');
    serviceNode.stop()
        .then(() => process.exit(0))
        .catch(exception => {
            console.log(exception.message);
            process.exit(1);
        });
});