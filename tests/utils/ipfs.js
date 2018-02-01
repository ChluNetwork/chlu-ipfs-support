const ipfsUtils = require('../../src/utils/ipfs');
const constants = require('../../src/constants');
const { isNode } = require('../../src/utils/env');
const path = require('path');

async function createIPFS(options) {
    const configuration = Object.assign({}, constants.defaultIPFSOptions);
    configuration.config.Addresses.Swarm = ['/ip4/127.0.0.1/tcp/13579/ws/p2p-websocket-star'];
    configuration.repo = isNode() ? path.join('/tmp/chlu-ipfs-' + Math.random() + Date.now()) : 'chlu-ipfs-' + Date.now() + Math.random();

    return await ipfsUtils.createIPFS(Object.assign(configuration, options || {}));
}

async function connect(ipfs1, ipfs2){
    await ipfs2.swarm.connect(ipfs1._peerInfo.multiaddrs._multiaddrs[0].toString());
    await ipfs1.swarm.connect(ipfs2._peerInfo.multiaddrs._multiaddrs[0].toString());
}

module.exports = {
    createIPFS,
    connect
};