const IPFS = require('ipfs');
const multihashes = require('multihashes');
  
async function createIPFS(options) {
    return await new Promise(fullfill => {
        const node = new IPFS(options);

        node.on('ready', () => fullfill(node));
    });
}

function multihashToString(multihash) {
    if (typeof multihash === 'string') return multihash;
    return multihashes.toB58String(multihash);
}

function encodeMessage(msg){
    return Buffer.from(JSON.stringify(msg));
}

module.exports = { createIPFS, multihashToString, encodeMessage };