const DAGNode = require('ipld-dag-pb').DAGNode;
const utils = require('../utils/ipfs');
const env = require('../utils/env');
const IPFSAPI = require('ipfs-api');
const { set } = require('lodash');
const axios = require('axios');
const constants = require('../constants');

class IPFS {
    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
    }

    async start() {
        const logger = this.chluIpfs.logger;
        if (!this.chluIpfs.ipfs) {
            logger.debug('Initializing IPFS, type: ' + (this.chluIpfs.ipfsOptions.type || 'JS (Internal)'));
            logger.debug('Detected environment: ' + env.isNode() ? 'Node.JS' : 'Browser');
            let ipfs;
            if (this.chluIpfs.ipfsOptions.remote) {
                logger.debug('Connecting to IPFS API');
                // Connect to existing IPFS Node
                ipfs = IPFSAPI(this.chluIpfs.ipfsOptions);
                // TODO: check that pubsub is supported (it might be disabled)
            } else {
                logger.debug('Starting JS-IPFS in this process');
                // Default: Start a local IPFS Node
                if (this.chluIpfs.circuit) {
                    set(this.chluIpfs.ipfsOptions, 'EXPERIMENTAL.relay.enabled', true);
                }
                if (this.chluIpfs.relay) {
                    set(this.chluIpfs.ipfsOptions, 'EXPERIMENTAL.relay.hop.enabled', true);
                    set(this.chluIpfs.ipfsOptions, 'EXPERIMENTAL.relay.hop.active', true);
                }
                // If we detect a local rendezvous server, just use that (helps with running offline)
                const useLocalRendezvous = await this.detectLocalRendezvous();
                if (useLocalRendezvous) {
                    this.chluIpfs.logger.debug('Using local rendezvous server, preparing for OFFLINE mode');
                    const swarmPath = 'config.Addresses.Swarm';
                    set(this.chluIpfs.ipfsOptions, swarmPath, [constants.localRendezvousAddress]);
                }
                ipfs = await utils.createIPFS(this.chluIpfs.ipfsOptions);
            }
            this.chluIpfs.ipfs = ipfs;
            const ipfsVersion = await ipfs.version();
            logger.info('IPFS ID: ' + (await ipfs.id()).id);
            if (this.chluIpfs.bootstrap) {
                logger.debug('Connecting to bootstrap Chlu nodes');
                const nodes = env.isNode() ? this.chluIpfs.chluBootstrapNodes.nodeJs : this.chluIpfs.chluBootstrapNodes.browser;
                this.connectToNodes(nodes); // do not await for this, let it run in the background
            } else {
                logger.debug('Skipping Chlu bootstrap phase');
            }
            logger.debug('Initialized IPFS, version ' + ipfsVersion.version);
            if (!ipfs.pin) {
                logger.warn('This node is running an IPFS client that does not implement pinning. Falling back to just retrieving the data non recursively. This will not be supported');
            }
        }
    }

    async detectLocalRendezvous() {
        try {
            this.chluIpfs.logger.debug('Detecting local rendezvous server');
            const response = await axios({
                url: 'http://localhost:' + constants.rendezvousPorts.local,
                timeout: 500 // do not hang there waiting forever
            });
            // If called like this, the rendezvous actually replies with a web page
            // if we detect that page, we know the rendezvous is running
            const ok = response && response.status === 200;
            this.chluIpfs.logger.debug(ok ? 'Detecting rendezvous: got 200' : 'Rendezvous not detected (response code not 200)');
            const found = response && response.data && response.data.indexOf('This is a libp2p-websocket-star signalling-server') > 0;
            this.chluIpfs.logger.debug(found ? 'Detecting rendezvous: response data matched' : 'Rendezvous not detected (response data did not match)');
            return ok && found;
        } catch (error) {
            this.chluIpfs.logger.debug('Local rendezvous not detected (exception raised)');
            return false;
        }
    }

    async stop() {
        await this.chluIpfs.ipfs.stop();
        this.chluIpfs.ipfs = undefined;
    }
    
    async connectToNodes(addrs) {
        const total = addrs.length;
        this.chluIpfs.logger.debug('Started connection attempt to ' + total + ' addresses');
        let connectedCount = 0;
        return new Promise(resolve => {
            addrs.map(async (addr, ii) => {
                const i = ii + 1;
                try {
                    this.chluIpfs.logger.debug('Connecting to IPFS address (' + i + '/' + total + ') ' + addr);
                    await this.chluIpfs.ipfs.swarm.connect(addr);
                    connectedCount++;
                    this.chluIpfs.logger.debug('Connected to IPFS address (' + i + '/' + total + ') ' + addr);
                } catch (error) {
                    this.chluIpfs.logger.debug('Connection FAILED to IPFS address (' + i + '/' + total + ') ' + addr);
                }
                if (i === total) {
                    this.chluIpfs.logger.debug('Connect attempts finished. Connected to ' + connectedCount + '/' + total);
                    resolve(connectedCount);
                }
            });
        });
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