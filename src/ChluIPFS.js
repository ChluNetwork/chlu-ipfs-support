const IPFSUtils = require('./modules/ipfs');
const Pinning = require('./modules/pinning');
const Room = require('./modules/room');
const ReviewRecords = require('./modules/reviewrecords');
const Validator = require('./modules/validator');
const DB = require('./modules/orbitdb');
const Persistence = require('./modules/persistence');
const ServiceNode = require('./modules/servicenode');
const Crypto = require('./modules/crypto');
const storageUtils = require('./utils/storage');
const EventEmitter = require('events');
const constants = require('./constants');
const defaultLogger = require('./utils/logger');

class ChluIPFS {
    constructor(options = {}){
        // Configuration
        this.storage = storageUtils;
        if (typeof options.enablePersistence === 'undefined') {
            this.enablePersistence = true;
        } else {
            this.enablePersistence = options.enablePersistence;
        }
        this.directory = options.directory || this.storage.getDefaultDirectory();
        const additionalOptions = {
            repo: IPFSUtils.getDefaultRepoPath(this.directory)
        };
        this.orbitDbDirectory = options.orbitDbDirectory || IPFSUtils.getDefaultOrbitDBPath(this.directory);
        this.ipfsOptions = Object.assign(
            {},
            constants.defaultIPFSOptions,
            additionalOptions,
            options.ipfs || {}
        );
        this.type = options.type;
        if (Object.values(constants.types).indexOf(this.type) < 0) {
            throw new Error('Invalid type');
        }
        this.events = new EventEmitter();
        this.logger = options.logger || defaultLogger;
        // Modules
        this.ipfsUtils = new IPFSUtils(this);
        this.orbitDb = new DB(this);
        this.pinning = new Pinning(this);
        this.room = new Room(this);
        this.reviewRecords = new ReviewRecords(this);
        this.validator = new Validator(this);
        this.persistence = new Persistence(this);
        this.serviceNode = new ServiceNode(this);
        this.crypto = new Crypto(this);
        this.ready = false;
        this.starting = false;
    }
    
    async start(){
        this.starting = true;
        this.events.emit('starting');
        this.logger.debug('Starting ChluIPFS, directory: ' + this.directory);
        if (!this.ipfs) {
            this.logger.debug('Initializing IPFS');
            this.ipfs = await IPFSUtils.createIPFS(this.ipfsOptions);
            this.logger.debug('Initialized IPFS');
        }

        await this.orbitDb.start();
        await this.room.start();

        // Load previously persisted data
        await this.persistence.loadPersistedData();

        if (this.type === constants.types.customer && !this.orbitDb.getPersonalDBAddress()) {
            await this.orbitDb.openPersonalOrbitDB(constants.customerDbName);
            await this.persistence.persistData();
        }

        if (this.type === constants.types.customer) {
            // Broadcast my review updates DB, but don't fail if nobody replicates
            this.room.broadcastReviewUpdates(false);
        } else if (this.type === constants.types.service) {
            await this.serviceNode.start();
        }
        this.ready = true;
        this.starting = false;
        this.events.emit('ready');
        return true;
    }

    async stop() {
        this.events.emit('stopping');
        this.ready = false;
        await this.serviceNode.stop();
        await this.persistence.persistData();
        await this.orbitDb.stop();
        await this.room.stop();
        await this.ipfs.stop();
        this.events.emit('stop');
        this.ipfs = undefined;
    }

    async waitUntilReady() {
        if (!this.ready) {
            if (this.starting) {
                await new Promise(resolve => {
                    this.events.once('ready', resolve);
                });
            } else {
                throw new Error('The ChluIPFS node needs to be started');
            }
        }
    }

    async switchType(newType) {
        if (this.type !== newType) {
            this.starting = true;
            this.events.emit('starting');
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
            this.events.emit('ready');
        }
    }

    getOrbitDBAddress(){
        return this.orbitDb.getPersonalDBAddress();
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