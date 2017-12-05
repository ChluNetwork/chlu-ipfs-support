#!/usr/bin/env node
const ChluIPFS = require('./index.js');

let serviceNode = null;

async function main(){
    serviceNode = new ChluIPFS({ type: ChluIPFS.types.service });
    console.log('Creating Chlu Experimental Service Node');
    console.log('Starting Chlu IPFS');
    await serviceNode.start();
    console.log('Starting Service Node');
    await serviceNode.runServiceNode();

    serviceNode.room.on('peer joined', (peer) => {
        console.log('Peer joined the room', peer);
    });

    serviceNode.room.on('peer left', (peer) => {
        console.log('Peer left...', peer);
    });
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