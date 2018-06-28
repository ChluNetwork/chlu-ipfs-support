const IPFSUtils = require('./modules/ipfs');
const ChluProtobuf = require('./modules/protobuf')
const Cache = require('./modules/cache');
const Pinning = require('./modules/pinning');
const Room = require('./modules/room');
const ReviewRecords = require('./modules/reviewrecords');
const Validator = require('./modules/validator');
const DB = require('./modules/orbitdb');
const Persistence = require('./modules/persistence');
const ServiceNode = require('./modules/servicenode');
const DID = require('./modules/did');
const Crypto = require('./modules/crypto');
const Bitcoin = require('./modules/bitcoin');
const storageUtils = require('./utils/storage');
const EventEmitter = require('events');
const constants = require('./constants');
const http = require('./utils/http');
const defaultLogger = require('./utils/logger');
const { cloneDeep } = require('lodash');
const env = require('./utils/env');

class ChluIPFS {
    constructor(options = {}){
        // Prepare logger and event emitter
        this.events = new EventEmitter();
        this.logger = options.logger || defaultLogger;
        // Load storage module
        this.storage = storageUtils;
        // Choose default network
        if (process.env.CHLU_NETWORK) {
            this.defaultNetwork = process.env.CHLU_NETWORK;
        } else if (process.env.NODE_ENV === 'production') {
            this.defaultNetwork = constants.networks.default;
        } else {
            this.defaultNetwork = constants.networks.experimental;
        }
        // Choose network
        this.network = options.network || this.defaultNetwork;
        if (this.network === constants.networks.default) {
            // Unset so that modules know to connect to main net
            this.network = '';
        }
        // See if enabling persistence
        if (typeof options.enablePersistence === 'undefined') {
            this.enablePersistence = true;
        } else {
            this.enablePersistence = options.enablePersistence;
        }
        // Choose Chlu directory
        this.directory = options.directory || this.storage.getDefaultDirectory();
        // Set up IPFS options
        const additionalOptions = {
            repo: IPFSUtils.getDefaultRepoPath(this.directory)
        };
        const defaultSwarmAddresses = env.isNode()
            ? constants.defaultSwarmAddresses.nodeJs
            : constants.defaultSwarmAddresses.browser;
        const swarmAddresses = options.listen ? defaultSwarmAddresses : [];
        if (options.useRendezvous !== false) {
            // By default, use rendezvous points for websocket-star
            swarmAddresses.push(...constants.defaultSwarmAddresses.rendezvous);
        }
        if (options.circuit || options.relay) {
            // Do not use circuit relay by default
            // Acting as relay requires enabling circuit
            this.circuit = true;
        }
        if (options.relay) {
            // Do not act as relay by default
            this.relay = true;
        }
        this.ipfsOptions = Object.assign(
            {},
            // default IPFS config
            constants.defaultIPFSOptions,
            // pass swarm addresses determined just now
            {
                config: {
                    Addresses: {
                        Swarm: swarmAddresses
                    }
                }
            },
            // additional options set up just now
            additionalOptions,
            // finally options passed by the caller
            options.ipfs || {}
        );
        // Set up OrbitDB Directory/Path
        this.orbitDbDirectory = options.orbitDbDirectory || IPFSUtils.getDefaultOrbitDBPath(this.directory);
        // Set up Chlu bootstrap nodes
        this.chluBootstrapNodes = cloneDeep(constants.chluBootstrapNodes);
        // disable Chlu bootstrap by default
        this.bootstrap = options.bootstrap;
        // Check Chlu node type
        this.type = options.type;
        if (Object.values(constants.types).indexOf(this.type) < 0) {
            throw new Error('Invalid type');
        }
        // Load Modules
        this.protobuf = new ChluProtobuf()
        this.cache = new Cache(this, options.cache);
        this.http = http;
        this.ipfsUtils = new IPFSUtils(this);
        this.orbitDb = new DB(this);
        this.pinning = new Pinning(this);
        this.room = new Room(this);
        this.reviewRecords = new ReviewRecords(this);
        this.validator = new Validator(this);
        this.persistence = new Persistence(this);
        this.serviceNode = new ServiceNode(this);
        this.did = new DID(this);
        this.crypto = new Crypto(this);
        this.bitcoin = new Bitcoin(this, {
            apiKey: options.blockCypherApiKey,
            network: options.bitcoinNetwork
        });
        this.ready = false;
        this.starting = false;
    }
    
    async start(){
        this.starting = true;
        this.events.emit('chlu-ipfs/starting');
        this.logger.debug('Starting ChluIPFS');
        this.logger.debug('Using ' + this.type + ' mode');
        this.logger.debug('Directory: ' + this.directory);
        this.logger.debug('Using Network: ' + (this.network || '----- PRODUCTION -----'));

        // First start IPFS stuff, because some of the persistence loading stuff requires it
        await this.ipfsUtils.start();
        // Load previously persisted data
        await this.persistence.loadPersistedData();
        // Start other modules
        await this.orbitDb.start();
        await this.room.start();
        await this.bitcoin.start();

        // Note: this action requires IPFS to be already started and persisted data to be loaded
        await this.did.start()

        if (this.type === constants.types.service) {
            await this.serviceNode.start();
        }

        this.ready = true;
        this.starting = false;
        this.events.emit('chlu-ipfs/ready');
        return true;
    }

    async stop() {
        this.events.emit('chlu-ipfs/stopping');
        this.ready = false;
        await this.serviceNode.stop();
        await this.persistence.persistData();
        await this.orbitDb.stop();
        await this.room.stop();
        await this.ipfsUtils.stop();
        this.events.emit('chlu-ipfs/stopped');
    }

    async waitUntilReady() {
        if (!this.ready) {
            if (this.starting) {
                await new Promise(resolve => {
                    this.events.once('chlu-ipfs/ready', resolve);
                });
            } else {
                throw new Error('The ChluIPFS node needs to be started');
            }
        }
    }

    async switchType(newType) {
        if (this.type !== newType) {
            this.starting = true;
            this.events.emit('chlu-ipfs/starting');
            this.ready = false;
            await this.persistence.persistData();
            if (this.type === constants.types.customer) {
                if (this.db) await this.db.close();
                this.db = undefined;
            }
            if (this.type === constants.types.service) {
                await this.serviceNode.stop();
            }
            this.type = newType;
            await this.persistence.loadPersistedData();
            this.starting = false;
            this.ready = true;
            this.events.emit('chlu-ipfs/ready');
        }
    }

    async readReviewRecord(multihash, options = {}) {
        await this.waitUntilReady();
        return await this.reviewRecords.readReviewRecord(multihash, options);
    }

    async storeReviewRecord(reviewRecord, options = {}) {
        await this.waitUntilReady();
        return await this.reviewRecords.storeReviewRecord(reviewRecord, options);
    }

    async exportData() {
        const exported = {};
        if (this.type === constants.types.customer) {
            exported.customerDbKeys = {
                pub: await this.db.keystore.exportPublicKey(),
                priv: await this.db.keystore.exportPrivateKey()
            };
        }
        return exported;
    }

    async importData() {
        throw new Error('not implemented');
    }

    async getVendorKeys() {
        throw new Error('not implemented');
    }
    
    async publishKeys() {
        throw new Error('not implemented');
    }

}

module.exports = Object.assign(ChluIPFS, constants);