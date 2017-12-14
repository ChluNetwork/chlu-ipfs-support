const ipfsUtils = require('../../src/utils/ipfs');

module.exports = {
    async createIPFS(options) {
        const defaults = {
            EXPERIMENTAL: {
                pubsub: true
            },
            config: {
                Addresses: {
                    API: '/ip4/127.0.0.1/tcp/0',
                    Swarm: ['/ip4/127.0.0.1/tcp/0'],
                    Gateway: '/ip4/0.0.0.0/tcp/0'
                },
                Bootstrap: [],
                Discovery: {
                    MDNS: {
                        Enabled: true,
                        Interval: 1
                    }
                }
            }
        };
        return await ipfsUtils.createIPFS(Object.assign({}, defaults, options));
    },
    async connect(ipfs1, ipfs2){
        await ipfs2.swarm.connect(ipfs1._peerInfo.multiaddrs._multiaddrs[0].toString());
        await ipfs1.swarm.connect(ipfs2._peerInfo.multiaddrs._multiaddrs[0].toString());
    }
}