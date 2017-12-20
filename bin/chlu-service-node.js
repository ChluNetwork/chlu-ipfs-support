#!/usr/bin/env node
const ChluIPFS = require('../src/index.js');

let serviceNode = null;

async function main(){
    console.log('Starting Chlu IPFS Service Node');
    serviceNode = new ChluIPFS({ type: ChluIPFS.types.service });
    await serviceNode.start();
}

main().then(() => console.log('Service Node Started'));

process.on('SIGINT', async function() {
    console.log('Stopping gracefully');
    try {
        if (serviceNode) {
            await serviceNode.stop();
        }
        process.exit(0);
    } catch(exception) {
        process.exit(1);
    }
});