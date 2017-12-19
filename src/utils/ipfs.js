const multihashes = require('multihashes');

async function createIPFS(options) {
    return await new Promise(fullfill => {
        const IPFS = require('ipfs');
        const node = new IPFS(options);

        node.on('ready', () => fullfill(node));
    });
}

function createIPFSAPI(options) {
    const IpfsApi = require('ipfs-api');
    const node = IpfsApi(options);
    return node;
}

function multihashToString(multihash) {
    if (typeof multihash === 'string') return multihash;
    return multihashes.toB58String(multihash);
}

function encodeMessage(msg){
    return Buffer.from(JSON.stringify(msg));
}

function decodeMessage(msg){
    let str;
    if (msg.data) {
        str = msg.data.toString();
    } else {
        str = msg;
    }
    try {
        return JSON.parse(str);
    } catch(exception) {
        return null;
    }
}

module.exports = {
    createIPFS,
    createIPFSAPI,
    multihashToString,
    encodeMessage,
    decodeMessage
};