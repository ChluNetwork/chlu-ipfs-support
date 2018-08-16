const IPFSUtils = require('./modules/ipfs');
const ChluProtobuf = require('./modules/protobuf')
const Cache = require('./modules/cache');
const Pinning = require('./modules/pinning');
const Room = require('./modules/room');
const ReviewRecords = require('./modules/reviewrecords');
const Validator = require('./modules/validator');
const DB = require('./modules/orbitdb');
const Persistence = require('./modules/persistence');
const DIDIPFSHelper = require('./modules/didIpfsHelper');
const Crypto = require('./modules/crypto');
const Bitcoin = require('./modules/bitcoin');
const storageUtils = require('./utils/storage');
const EventEmitter = require('events');
const constants = require('./constants');
const http = require('./utils/http');
const defaultLogger = require('./utils/logger');
const { cloneDeep } = require('lodash');
const env = require('./utils/env');

/**
 * ChluIPFS is a library that handles the storage,
 * exchange and discovery of Chlu data using the
 * IPFS protocol. This class can be instanced to
 * provide an high level Chlu specific API
 * to interact with Chlu data.
 * 
 * Remember to call .start() after setting it up
 * 
 * @param {Object} options mandatory configuration
 * @param {string} options.type (mandatory) one of the values contained in ChluIPFS.types
 * @param {boolean} options.mock default false. If true, constructs a mock ChluIPFS
 * instance with all the exposed calls faked and no internals. These faked
 * calls always resolve, and the async ones do so after a short delay to simulate
 * real activity. Use this for testing your UI during development
 * @param {string} options.directory where to store all chlu-ipfs data, defaults to ~/.chlu
 * @param {Object} options.logger custom logger if you want to override the default. Needs
 * error, warn, info and debug methods which will be called with one string argument
 * @param {boolean} options.enablePersistance default true. If false, does not persist Chlu specific
 * data. This will not disable IPFS and OrbitDB persistence
 */
class ChluIPFS {
    constructor(options = {}){
        // Reference used constants from instance
        this.constants = constants
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
                    },
                    // TODO: use these when we switch away from rendezvous
                    Bootstrap: options.useRendezvous !== false ? [] : undefined
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
        // Load Modules
        this.protobuf = new ChluProtobuf()
        this.cache = new Cache(this, options.cache);
        this.http = http;
        this.ipfsUtils = new IPFSUtils(this);
        this.orbitDb = new DB(this, options.OrbitDBIndex || options.OrbitDBIndexName, options.OrbitDBIndexOptions);
        this.pinning = new Pinning(this);
        this.room = new Room(this, options.ignoreOwnMessages);
        this.reviewRecords = new ReviewRecords(this);
        this.validator = new Validator(this);
        this.persistence = new Persistence(this);
        this.didIpfsHelper = new DIDIPFSHelper(this, options.did);
        this.crypto = new Crypto(this);
        this.bitcoin = new Bitcoin(this, {
            apiKey: options.blockCypherApiKey,
            network: options.bitcoinNetwork
        });
        this.ready = false;
        this.starting = false;
        // Retrocompatibility. TODO: Remove this once not needed anymore
        this.instance = this
    }
    
    /**
     * Start subsystems. Call this before any ChluIPFS operations
     * but after you made any change to the internal modules or
     * configurations.
     * 
     * @returns {Promise} resolves when fully ready
     * @memberof ChluIPFS
     */
    async start(){
        this.starting = true;
        this.events.emit('chlu-ipfs/starting');
        this.logger.debug('Starting ChluIPFS');
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
        await this.didIpfsHelper.start()

        this.ready = true;
        this.starting = false;
        this.events.emit('chlu-ipfs/ready');
        return true;
    }

    /**
     * Stop all subsystems. Use this to stop gracefully
     * before exiting from a Node.js process
     * 
     * @returns {Promise} resolves when fully stopped
     * @memberof ChluIPFS
     */
    async stop() {
        this.events.emit('chlu-ipfs/stopping');
        this.ready = false;
        await this.persistence.persistData();
        await this.orbitDb.stop();
        await this.room.stop();
        await this.ipfsUtils.stop();
        this.events.emit('chlu-ipfs/stopped');
    }

    /**
     * If the node is starting, waits until it's ready for use
     *
     * @memberof ChluIPFS
     */
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

    /**
     * Recursively Pin arbitrary multihashes. Falls back to a
     * shallow (non recursive) fetch with a warning if the underlying
     * IPFS node does not support pinning
     * 
     * @param {string} multihash
     * @returns {Promise} resolves when the pinning process has completed
     * @memberof ChluIPFS
     */
    async pin(multihash){
        // TODO: tests for this (it was broken)
        return await this.instance.pinning.pin(multihash);
    }

    /**
     * Send message to other Chlu nodes. Listen for responses
     * by subscribing to the pubsub/message event
     *
     * @param {object} message
     * @memberof ChluIPFS
     */
    async broadcast(message) {
        return await this.instance.room.broadcast(message)
    }

    /**
     * Reads the review record at the given multihash.
     * Returns the review record decoded into a javascript object
     * 
     * The options object optionally accepts:
     * 
     * 
     * @returns {Promise} resolves to the review record
     * @param {string} multihash 
     * @param {Object} options optional additional preferences
     * @param {boolean} options.validate whether to check for validity (default true). Throws if the review record is invalid
     * @param {Function} options.checkForUpdates default false, if true will emit 'updated ReviewRecords' events when this RR is updated
     * @memberof ChluIPFS
     * requested review record
     */
    async readReviewRecord(multihash, options = {}) {
        await this.waitUntilReady();
        return await this.reviewRecords.readReviewRecord(multihash, options);
    }

    /**
     * Takes a fully compiled review record except for fields that will be autofilled
     * such as the internal hash. The review record is checked for validity before
     * being written to IPFS.
     * 
     * @returns {string} multihash the multihash of the RR stored in IPFS
     * @param {Object} reviewRecord as a javascript object
     * @param {Object} options optional additional preferences
     * @param {boolean} options.validate default true, check for validity before writing. Throws if invalid
     * @param {boolean} options.publish default true, when false the RR is not shared with the Chlu network
     * and not advertised to other nodes
     * @param {string} options.bitcoinTransactionHash set this to the transaction hash of the bitcoin transaction if applicable
     * @memberof ChluIPFS
     */
    async storeReviewRecord(reviewRecord, options = {}) {
        await this.waitUntilReady();
        return await this.reviewRecords.storeReviewRecord(reviewRecord, options);
    }

    /**
     * Import unverified reviews and publish them on Chlu.
     * Make sure the reviews are in the right format
     *
     * @param {[Object]} reviews
     * @returns {[string]} multihashes
     * @memberof ChluIPFS
     */
    async importUnverifiedReviews(reviews) {
        await this.waitUntilReady()
        return await this.reviewRecords.importUnverifiedReviews(reviews)
    }

    /**
     * Generate a new DID and switch to it.
     *
     * @param {boolean} [publish=true] if you want to publish the DID
     * @param {boolean} [waitForReplication=false] if you want our promise to resolve only when the data has been replicated remotely
     * @memberof ChluIPFS
     */
    async generateNewDID(publish, waitForReplication) {
        await this.waitUntilReady()
        return await this.didIpfsHelper.generate(publish, waitForReplication)
    }

    /**
     * Get the DID public document and private key used by Chlu
     *
     * @returns {Object} did
     * @memberof ChluIPFS
     */
    async exportDID() {
        await this.waitUntilReady()
        return await this.didIpfsHelper.export()
    }

    /**
     * Publish a public DID Document. Needs to be signed by the owner.
     * Only use this to publish third party DIDs and the in use DID, which
     * is automatically published.
     *
     * @param {object} publicDidDocument
     * @param {object} [signature=null]
     * @param {boolean} [waitForReplication=true]
     * @memberof ChluIPFS
     */
    async publishDID(publicDidDocument, signature, waitForReplication = true) {
        if (!publicDidDocument) throw new Error('publicDidDocument is required')
        if (!signature) throw new Error('signature is required')
        return await this.didIpfsHelper.publish({
            publicDidDocument,
            signature
        }, waitForReplication)
    }

    /**
     * Import an existing DID
     *
     * @param {Object} did
     * @param {Object} did.publicDidDocument your public did document
     * @param {Object} did.privateKeyBase58 your DID private key
     * @param {boolean} [publish=true] if you want to publish the DID
     * @param {boolean} [waitForReplication=false] if you want our promise to resolve only when the data has been replicated remotely
     * @memberof ChluIPFS
     */
    async importDID(did, publish, waitForReplication) {
        await this.waitUntilReady()
        return await this.didIpfsHelper.import(did, publish, waitForReplication)
    }

    /**
     * Get reviews written by a DID
     *
     * @param {string} didId
     * @param {integer} offset
     * @param {integer} limit
     * @returns {Array}
     * @memberof ChluIPFS
     */
    async getReviewsWrittenByDID(didId, offset, limit) {
        await this.waitUntilReady()
        return await this.orbitDb.getReviewsWrittenByDID(didId, offset, limit)
    }

    /**
     * Get reviews written about a DID
     *
     * @param {string} didId
     * @param {integer} offset
     * @param {integer} limit
     * @returns {Array}
     * @memberof ChluIPFS
     */
    async getReviewsAboutDID(didId, offset, limit) {
        await this.waitUntilReady()
        return await this.orbitDb.getReviewsAboutDID(didId, offset, limit)
    }

    /**
     * Get all reviews
     *
     * @param {string} didId
     * @param {integer} offset
     * @param {integer} limit
     * @returns {Array}
     * @memberof ChluIPFS
     */
    async getReviewList(offset, limit) {
        await this.waitUntilReady()
        return await this.orbitDb.getReviewRecordList(offset, limit)
    }

    /**
     * Get the Public DID Document for a DID
     *
     * @param {*} didId
     * @param {boolean} [waitUntilPresent=false]
     * @returns
     * @memberof ChluIPFS
     */
    async getDID(didId, waitUntilPresent = false) {
        await this.waitUntilReady()
        return await this.didIpfsHelper.getDID(didId, waitUntilPresent)
    }

}

module.exports = Object.assign(ChluIPFS, constants);