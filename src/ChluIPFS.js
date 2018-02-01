const ipfsUtils = require('./utils/ipfs');
const Pinning = require('./modules/pinning');
const Room = require('./modules/room');
const ReviewRecords = require('./modules/reviewrecords');
const storageUtils = require('./utils/storage');
const OrbitDB = require('orbit-db');
const EventEmitter = require('events');
const constants = require('./constants');
const defaultLogger = require('./utils/logger');

const defaultIPFSOptions = {
    EXPERIMENTAL: {
        pubsub: true
    },
    config: {
        Addresses: {
            Swarm: [
                // Enable WebSocketStar transport
                '/dns4/replicator.chlu.io/tcp/13579/ws/p2p-websocket-star/',
                '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
                '/dns4/ws-star-signal-1.servep2p.com/tcp/443/wss/p2p-websocket-star',
                '/dns4/ws-star-signal-2.servep2p.com/tcp/443/wss/p2p-websocket-star'
            ]
        }
    }
};

class ChluIPFS {

    constructor(options = {}){
        this.utils = ipfsUtils;
        this.storage = storageUtils;
        if (typeof options.enablePersistence === 'undefined') {
            this.enablePersistence = true;
        } else {
            this.enablePersistence = options.enablePersistence;
        }
        this.directory = options.directory || this.storage.getDefaultDirectory();
        const additionalOptions = {
            repo: this.utils.getDefaultRepoPath(this.directory)
        };
        this.orbitDbDirectory = options.orbitDbDirectory || this.utils.getDefaultOrbitDBPath(this.directory);
        this.ipfsOptions = Object.assign(
            {},
            defaultIPFSOptions,
            additionalOptions,
            options.ipfs || {}
        );
        this.type = options.type;
        if (Object.values(constants.types).indexOf(this.type) < 0) {
            throw new Error('Invalid type');
        }
        this.events = new EventEmitter();
        this.logger = options.logger || defaultLogger;
        this.dbs = {};
        // Modules
        this.pinning = new Pinning(this);
        this.room = new Room(this);
        this.reviewRecords = new ReviewRecords(this);
    }
    
    async start(){
        this.logger.debug('Starting ChluIPFS, directory: ' + this.directory);
        if (!this.ipfs) {
            this.logger.debug('Initializing IPFS');
            this.ipfs = await this.utils.createIPFS(this.ipfsOptions);
            this.logger.debug('Initialized IPFS');
        }
        if (!this.orbitDb) {
            this.logger.debug('Initializing OrbitDB with directory ' + this.orbitDbDirectory);
            this.orbitDb = new OrbitDB(this.ipfs, this.orbitDbDirectory);
            this.logger.debug('Initialized OrbitDB with directory ' + this.orbitDbDirectory);
        }

        await this.room.start();

        // Load previously persisted data
        await this.loadPersistedData();

        // Create Customer Review Updates DB if not already loaded
        if (this.type === constants.types.customer && !this.db) {
            this.db = await this.openDb(constants.customerDbName);
        }

        // Save data
        await this.persistData();

        // If customer, also wait for at least one peer to join the room (TODO: review this)
        if (this.type === constants.types.customer) {
            await this.room.waitForAnyPeer();
            // Broadcast my review updates DB
            this.room.broadcastReviewUpdates();
        }

        return true;
    }

    async stop() {
        await this.persistData();
        await this.orbitDb.stop();
        await this.room.stop();
        await this.ipfs.stop();
        this.db = undefined;
        this.dbs = {};
        this.orbitDb = undefined;
        this.ipfs = undefined;
    }

    async switchType(newType) {
        if (this.type !== newType) {
            await this.persistData();
            if (this.type === constants.types.customer) {
                if (this.db) await this.db.close();
                this.db = undefined;
            }
            if (this.type === constants.types.service) {
                if (this.dbs) {
                    await Promise.all(Object.values(this.dbs).map(db => db.close()));
                }
                this.dbs = {};
            }
            this.type = newType;
            await this.loadPersistedData();
        }
    }

    getOrbitDBAddress(){
        if (this.type === constants.types.customer) {
            return this.db.address.toString();
        } else {
            throw new Error('Not a customer');
        }
    }

    async readReviewRecord(multihash, notifyUpdate = null) {
        return await this.reviewRecords.readReviewRecord(multihash, notifyUpdate);
    }

    async storeReviewRecord(reviewRecord, previousVersionMultihash = null) {
        return await this.reviewRecords.storeReviewRecord(reviewRecord, previousVersionMultihash);
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

    async openDb(address) {
        this.logger.debug('Opening ' + address);
        let db;
        try {
            db = await this.orbitDb.kvstore(address);
            this.listenToDBEvents(db);
            await db.load();
            this.logger.debug('Opened ' + address);
        } catch (error) {
            this.logger.error('Coud not Open ' + address + ': ' + error.message || error);
        }
        return db;
    }

    async openDbForReplication(address) {
        if (!this.dbs[address]) {
            this.dbs[address] = await this.openDb(address);
            // Make sure this DB address does not get lost
            if (this.dbs[address]) await this.persistData();
        }
        return this.dbs[address];
    }

    async replicate(address) {
        this.logger.info('Replicating ' + address);
        const db = await this.openDbForReplication(address);
        if (db) {
            this.room.broadcast({ type: constants.eventTypes.replicating, address });
            await new Promise(fullfill => {
                this.logger.debug('Waiting for next replication of ' + address);
                db.events.once('replicated', fullfill);
                db.events.once('ready', fullfill);
            });
            this.room.broadcast({ type: constants.eventTypes.replicated, address });
            this.logger.info('Replicated ' + address);
        }
    }

    async persistData() {
        if (this.enablePersistence) {
            const data = {};
            if (this.type === constants.types.customer) {
                // Customer OrbitDB Address
                data.orbitDbAddress = this.getOrbitDBAddress();
            } else if (this.type === constants.types.service) {
                // Service Node Synced OrbitDB addresses
                data.orbitDbAddresses = Object.keys(this.dbs);
            }
            this.logger.debug('Saving persisted data');
            try {
                await this.storage.save(this.directory, data, this.type);
            } catch (error) {
                this.logger.error('Could not write data: ' + error.message || error);
            }
            this.logger.debug('Saved persisted data');
        } else {
            this.logger.debug('Not persisting data, persistence disabled');
        }
    }

    async loadPersistedData() {
        if (this.enablePersistence) {
            this.logger.debug('Loading persisted data');
            const data = await this.storage.load(this.directory, this.type);
            this.logger.debug('Loaded persisted data');
            if (this.type === constants.types.service) {
                // Open known OrbitDBs so that we can seed them
                const addresses = data.orbitDbAddresses || [];
                this.logger.debug('Opening ' + addresses.length + ' OrbitDBs');
                for(const address of addresses) {
                    this.dbs[address] = await this.openDb(address);
                }
                this.logger.debug('Opened all persisted OrbitDBs');
            }
            if (this.type === constants.types.customer && data.orbitDbAddress) {
                // Open previously created Customer Review Update DB
                this.logger.debug('Opening existing Customer OrbitDB');
                this.db = await this.openDb(data.orbitDbAddress);
                if (this.db) this.logger.debug('Opened existing Customer OrbitDB');
            }
        } else {
            this.logger.debug('Not loading persisted data, persistence disabled');
        }
    }

    listenToDBEvents(db){
        db.events.on('replicated', address => {
            this.logger.debug('OrbitDB Event: Replicated ' + address);
        });
        db.events.on('replicate', address => {
            this.logger.debug('OrbitDB Event: Replicate ' + address);
        });
        db.events.on('replicate.progress', (address, hash, entry, progress) => {
            this.logger.debug('OrbitDB Event: Replicate Progress ' + progress + ' for address ' + address);
        });
        db.events.on('ready', () => this.logger.debug('OrbitDB Event: Ready'));
        db.events.on('write', () => this.logger.debug('OrbitDB Event: Write'));
        db.events.on('load', () => this.logger.debug('OrbitDB Event: Load'));
        db.events.on('load.progress', (address, hash, entry, progress, total) => {
            this.logger.debug('OrbitDB Event: Load Progress ' + progress + '/' + total + ' for address ' + address);
        });
    }

}

module.exports = Object.assign(ChluIPFS, constants);