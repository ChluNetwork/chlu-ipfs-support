const DAGNode = require('ipld-dag-pb').DAGNode;
const utils = require('../utils/ipfs');
const env = require('../utils/env');

class IPFS {
    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
    }

    async start() {
        const logger = this.chluIpfs.logger;
        if (!this.chluIpfs.ipfs) {
            logger.debug('Initializing IPFS, type: ' + (this.chluIpfs.ipfsOptions.type || 'JS (Internal)'));
            if (this.chluIpfs.ipfsOptions.enableRelayHop) {
                logger.info('Acting as libp2p relay');
            }
            const ipfs = this.chluIpfs.ipfs = await utils.createIPFS(this.chluIpfs.ipfsOptions);
            const ipfsVersion = await ipfs.version();
            logger.info('IPFS ID: ' + (await ipfs.id()).id);
            logger.debug('Detected environment: ' + env.isNode() ? 'Node.JS' : 'Browser');
            if (this.chluIpfs.bootstrap) {
                logger.debug('Connecting to bootstrap Chlu nodes');
                const nodes = env.isNode() ? this.chluIpfs.chluBootstrapNodes.nodeJs : this.chluIpfs.chluBootstrapNodes.browser;
                await this.connectToNodes(nodes);
                logger.debug('Connected to bootstrap Chlu nodes');
            } else {
                logger.debug('Skipping Chlu bootstrap phase');
            }
            logger.debug('Initialized IPFS, version ' + ipfsVersion.version);
            if (!ipfs.pin) {
                logger.warn('This node is running an IPFS client that does not implement pinning. Falling back to just retrieving the data non recursively. This will not be supported');
            }
        }
    }

    async stop() {
        await this.chluIpfs.ipfs.stop();
        this.chluIpfs.ipfs = undefined;
    }
    
    async connectToNodes(addrs) {
        const total = addrs.length;
        return Promise.all(addrs.map(async (addr, ii) => {
            const i = ii + 1;
            try {
                this.chluIpfs.logger.debug('Connecting to IPFS address (' + i + '/' + total + ') ' + addr);
                await this.chluIpfs.ipfs.swarm.connect(addr);
                this.chluIpfs.logger.debug('Connected to IPFS address (' + i + '/' + total + ') ' + addr);
            } catch (error) {
                this.chluIpfs.logger.warn('Connection FAILED to IPFS address (' + i + '/' + total + ') ' + addr);
                console.trace(error);
            }
        }));
    }

    async id() {
        return (await this.chluIpfs.ipfs.id()).id;
    }

    async get(multihash) {
        const dagNode = await this.chluIpfs.ipfs.object.get(utils.multihashToBuffer(multihash));
        return dagNode.data;
    }

    async createDAGNode(buf) {
        if (!Buffer.isBuffer(buf)) {
            throw new Error('Argument is not a buffer');
        }
        return await new Promise((resolve, reject) => {
            DAGNode.create(buf, [], (err, dagNode) => {
                if (err) reject(err); else resolve(dagNode);
            });
        });
    }

    async storeDAGNode(dagNode) {
        const newDagNode = await this.chluIpfs.ipfs.object.put(dagNode);
        if (newDagNode.toJSON().multihash !== dagNode.toJSON().multihash) {
            throw new Error('Multihash mismatch');
        }
        return utils.getDAGNodeMultihash(newDagNode);
    }

    async put(data) {
        let buf = null;
        if (typeof data === 'string') buf = Buffer.from(data);
        else if (Buffer.isBuffer(data)) buf = data;
        if (!Buffer.isBuffer(buf)) throw new Error('Could not convert data into buffer');
        const dagNode = await this.chluIpfs.ipfs.object.put(buf);
        return utils.getDAGNodeMultihash(dagNode);
    }
}

module.exports = Object.assign(IPFS, utils);