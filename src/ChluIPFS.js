const ipfsUtils = require('./utils/ipfs');
const protons = require('protons');
const storageUtils = require('./utils/storage');
const OrbitDB = require('orbit-db');
const Room = require('ipfs-pubsub-room');
const EventEmitter = require('events');
const constants = require('./constants');
const defaultLogger = require('./utils/logger');
const protobuf = protons(require('../src/utils/protobuf'));

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

        // PubSub setup
        if (!this.room) {
            this.room = Room(this.ipfs, constants.pubsubRoom);
            // Handle events
            this.listenToRoomEvents(this.room);
            this.room.on('message', message => this.handleMessage(message));
            // wait for room subscription
            await new Promise(resolve => {
                this.room.once('subscribed', () => resolve());
            });
        }

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
            if (this.room.getPeers().length === 0) {
                await new Promise(resolve => {
                    this.room.on('peer joined', () => resolve());
                });
            }
            // Broadcast my review updates DB
            this.broadcastReviewUpdates();
        }

        return true;
    }

    async stop() {
        await this.persistData();
        this.room.leave();
        await this.orbitDb.stop();
        await this.ipfs.stop();
        this.db = undefined;
        this.dbs = {};
        this.orbitDb = undefined;
        this.room = undefined;
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
                if (this.room) {
                    this.room.removeListener('message', this.serviceNodeRoomMessageListener);
                    this.serviceNodeRoomMessageListener = undefined;
                }
                if (this.dbs) {
                    await Promise.all(Object.values(this.dbs).map(db => db.close()));
                }
                this.dbs = {};
            }
            this.type = newType;
            await this.loadPersistedData();
        }
    }

    broadcastReviewUpdates(){
        this.room.broadcast(this.utils.encodeMessage({
            type: constants.eventTypes.customerReviews,
            address: this.getOrbitDBAddress()
        }));
    }

    async pin(multihash){
        this.utils.validateMultihash(multihash);
        // TODO: check that the multihash evaluates to valid Chlu data
        // broadcast start of pin process
        await this.room.broadcast(this.utils.encodeMessage({ type: constants.eventTypes.pinning, multihash }));
        try {
            if (this.ipfs.pin) {
                await this.ipfs.pin.add(multihash, { recursive: true });
            } else {
                // TODO: Chlu service node need to be able to pin, so we should support using go-ipfs
                this.logger.warn('This node is running an IPFS client that does not implement pinning. Falling back to just retrieving the data non recursively. This will not be supported');
                await this.ipfs.object.get(multihash);
            }
            // broadcast successful pin
            await this.room.broadcast(this.utils.encodeMessage({ type: constants.eventTypes.pinned, multihash }));
        } catch (error) {
            this.logger.error('IPFS Pin Error: ' + error.message);
            return;
        }
    }

    getOrbitDBAddress(){
        if (this.type === constants.types.customer) {
            return this.db.address.toString();
        } else {
            throw new Error('Not a customer');
        }
    }

    async getLastReviewRecordUpdate(db, multihash) {
        this.logger.debug('Checking for review updates for ' + multihash);
        let dbValue = multihash, updatedMultihash = multihash, path = [multihash];
        while (dbValue) {
            dbValue = await db.get(dbValue);
            if (typeof dbValue === 'string') {
                if (path.indexOf(dbValue) < 0) {
                    updatedMultihash = dbValue;
                    path.push(dbValue);
                    this.logger.debug('Found forward pointer from ' + multihash + ' to ' + updatedMultihash);
                } else {
                    throw new Error('Recursive references detected in this OrbitDB: ' + db.address.toString())
                }
            }
        }
        if (multihash != updatedMultihash) {
            this.logger.debug(multihash + ' updates to ' + updatedMultihash);
            return updatedMultihash;
        } else {
            this.logger.debug('no updates found for ' + multihash);
        }
    }

    async notifyIfReviewIsUpdated(db, multihash, notifyUpdate) {
        const updatedMultihash = await this.getLastReviewRecordUpdate(db, multihash);
        if (updatedMultihash) {
            // TODO: Check that the update is valid first
            notifyUpdate(multihash, updatedMultihash);
        }
    }

    async findLastReviewRecordUpdate(multihash, notifyUpdate) {
        const reviewRecord = await this.getReviewRecord(multihash);
        if (reviewRecord.orbitDb) {
            const db = await this.openDbForReplication(reviewRecord.orbitDb);
            db.events.once('replicated', () => this.notifyIfReviewIsUpdated(db, multihash, notifyUpdate));
            this.notifyIfReviewIsUpdated(db, multihash, notifyUpdate);
        }
    }

    async getReviewRecord(multihash){
        const dagNode = await this.ipfs.object.get(this.utils.multihashToBuffer(multihash));
        const buffer = dagNode.data;
        const messages = protons(require('../src/utils/protobuf'));
        const reviewRecord = messages.ReviewRecord.decode(buffer);
        return reviewRecord;
    }

    async readReviewRecord(multihash, notifyUpdate = null) {
        this.utils.validateMultihash(multihash);
        const reviewRecord = await this.getReviewRecord(multihash);
        // TODO validate
        if (notifyUpdate) this.findLastReviewRecordUpdate(multihash, notifyUpdate);
        return reviewRecord;
    }

    async storeReviewRecord(reviewRecord, previousVersionMultihash = null){
        if (this.type !== constants.types.customer) {
            throw new Error('Not a customer');
        }
        reviewRecord.orbitDb = this.getOrbitDBAddress();
        const buffer = protobuf.ReviewRecord.encode(reviewRecord);
        // TODO validate
        // write thing to ipfs
        const dagNode = await this.ipfs.object.put(buffer);
        const multihash = this.utils.multihashToString(dagNode.multihash);
        // Broadcast request for pin, then wait for response
        // TODO: handle a timeout and also rebroadcast periodically, otherwise new peers won't see the message
        let tasksToAwait = [];
        tasksToAwait.push(new Promise(fullfill => {
            this.events.once(constants.eventTypes.pinned + '_' + multihash, () => fullfill());
            this.room.broadcast(this.utils.encodeMessage({ type: constants.eventTypes.wroteReviewRecord, multihash }));
        }));
        if (previousVersionMultihash) {
            // This is a review update
            tasksToAwait.push(this.setForwardPointerForReviewRecord(previousVersionMultihash, multihash));
        }
        await Promise.all(tasksToAwait);
        return multihash;
    }

    async setForwardPointerForReviewRecord(previousVersionMultihash, multihash) {
        this.logger.debug('Setting forward pointer for ' + previousVersionMultihash + ' to ' + multihash);
        // TODO: verify that the update is valid
        await new Promise(async fullfill => {
            const address = this.getOrbitDBAddress();
            this.events.once(constants.eventTypes.replicated + '_' + address, () => fullfill());
            try {
                await this.db.set(previousVersionMultihash, multihash);
            } catch (error) {
                this.logger.error('OrbitDB Error: ' + error.message || error);
            }
            this.broadcastReviewUpdates();
            this.logger.debug('Waiting for remote replication');
        });
        this.logger.debug('Done setting forward pointer, the db has been replicated remotely');
        return multihash;
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

    async handleMessage(message) {
        try {
            const obj = JSON.parse(message.data.toString());

            // Handle internal events

            this.events.emit(obj.type || constants.eventTypes.unknown, obj);
            if (obj.type === constants.eventTypes.pinned) {
                // Emit internal PINNED event
                this.events.emit(constants.eventTypes.pinned + '_' + obj.multihash);
            }
            if (obj.type === constants.eventTypes.replicated) {
                // Emit internal REPLICATED event
                this.events.emit(constants.eventTypes.replicated + '_' + obj.address);
            }

            if (this.type === constants.types.service) {
                // Service node stuff
                const isOrbitDb = obj.type === constants.eventTypes.customerReviews || obj.type === constants.eventTypes.updatedReview;
                // handle ReviewRecord: pin hash
                if (obj.type === constants.eventTypes.wroteReviewRecord && typeof obj.multihash === 'string') {
                    this.logger.info('Pinning ReviewRecord ' + obj.multihash);
                    try {
                        await this.pin(obj.multihash);
                        this.logger.info('Pinned ReviewRecord ' + obj.multihash);
                    } catch(exception){
                        this.logger.error('Pin Error: ' + exception.message);
                    }
                } else if (isOrbitDb && typeof obj.address === 'string') {
                    // handle OrbitDB: replicate
                    try {
                        this.replicate(obj.address);
                    } catch(exception){
                        this.logger.error('OrbitDB Replication Error: ' + exception.message);
                    }
                }
            }
        } catch(exception) {
            this.logger.warn('Error while decoding PubSub message');
        }
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
            this.room.broadcast(this.utils.encodeMessage({ type: constants.eventTypes.replicating, address }));
            await new Promise(fullfill => {
                this.logger.debug('Waiting for next replication of ' + address);
                db.events.once('replicated', fullfill);
                db.events.once('ready', fullfill);
            });
            this.room.broadcast(this.utils.encodeMessage({ type: constants.eventTypes.replicated, address }));
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

    listenToRoomEvents(room){
        room.on('peer joined', peer => {
            this.logger.debug('Peer joined the pubsub room', peer);
        });
        room.on('peer left', peer => {
            this.logger.debug('Peer left the pubsub room', peer);
        });
        room.on('subscribed', () => {
            this.logger.debug('Connected to the pubsub room');
        });
        room.on('message', message => {
            this.logger.debug('PubSub Message from ' + message.from + ': ' + message.data.toString());
        });
        room.on('error', error => {
            this.logger.error('PubSub Room Error: ' + error.message || error);
        });
    }
}

module.exports = Object.assign(ChluIPFS, constants);