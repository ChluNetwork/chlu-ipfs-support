const constants = require('../../constants');
const OrbitDB = require('orbit-db');
const DefaultChluStore = require('./store');

class DB {

    constructor(chluIpfs){
        this.chluIpfs = chluIpfs;
        this.orbitDb = null;
        this.ChluStore = DefaultChluStore; // So that it can be overridden
        this.db = null;
    }

    async start() {
        if (!this.orbitDb) {
            this.chluIpfs.logger.debug('Initializing OrbitDB with directory ' + this.chluIpfs.orbitDbDirectory);
            if (this.ChluStore.type !== constants.orbitDb.storeType) {
                // This is to avoid passing a wrong Store implementation by mistake
                throw new Error('ChluStore given is incompatible');
            }
            try {
                OrbitDB.addDatabaseType(constants.orbitDb.storeType, this.ChluStore);
            } catch (error) {
                /*
                Unfortunately if the database type was already added this call crashes.
                We don't want to fail in this case, but since there is no way to check if the
                database type is already there, the simplest solution is just to ignore this
                error
                TODO: Fix this, probably by sending a PR to orbit-db
                */
            }
            this.orbitDb = new OrbitDB(this.chluIpfs.ipfs, this.chluIpfs.orbitDbDirectory);
            this.chluIpfs.logger.debug('Initialized OrbitDB with directory ' + this.chluIpfs.orbitDbDirectory);
        }
        if (!this.db)  await this.open();
    }

    getAddress() {
        return this.db.address.toString();
    }

    async stop() {
        this.chluIpfs.logger.debug('Stopping OrbitDB Module');
        if (this.db) await this.db.close();
        if (this.orbitDb) await this.orbitDb.stop();
        this.chluIpfs.logger.debug('Stopped OrbitDB Module');
    }

    getReviewRecordList() {
        return this.db.getReviewRecordList();
    }

    /**
     * Get the last review record update for the given multihash
     */
    get(multihash) {
        return this.db.getLatestReviewRecordUpdate(multihash) || multihash;
    }

    async set(multihash, previousVersionMultihash = null, txId = null) {
        if (previousVersionMultihash) {
            this.chluIpfs.logger.debug('Writing to OrbitDB: Review Update from ' + multihash + ' to ' + previousVersionMultihash);
            await this.db.updateReviewRecord(multihash, previousVersionMultihash);
        } else {
            this.chluIpfs.logger.debug('Writing to OrbitDB: Review Record ' + multihash + (txId ? (' with txId ' + txId) : ''));
            await this.db.addReviewRecord(multihash, txId);
        }
    }

    async setAndWaitForReplication(...args) {
        this.chluIpfs.logger.debug('Preparing to wait for remote OrbitDB Replication before Write');
        await new Promise((resolve, reject) => {
            this.chluIpfs.events.once(constants.eventTypes.replicated + '_' + this.getAddress(), () => resolve());
            this.set(...args).catch(reject);
        });
        this.chluIpfs.logger.debug('Remote replication event received: OrbitDB setAndWait Done');
    }

    async open() {
        this.chluIpfs.logger.debug('Opening Chlu OrbitDB');
        this.dbName = this.chluIpfs.network ? ('chlu-' + this.chluIpfs.network) : 'chlu';
        this.chluIpfs.logger.debug('Using OrbitDB type ' + this.ChluStore.type + ' named ' + this.dbName);
        this.db = await this.orbitDb.open(this.dbName, {
            type: this.ChluStore.type,
            create: true,
            write: ['*']
        });
        this.listenToDBEvents(this.db);
        this.chluIpfs.logger.debug('Loading Chlu OrbitDB cache');
        await this.db.load();
        this.chluIpfs.logger.debug('Chlu OrbitDB fully ready');
        return this.db;
    }

    listenToDBEvents(db){
        db.events.on('replicated', address => {
            this.chluIpfs.logger.debug('OrbitDB Event: Replicated ' + address);
            this.chluIpfs.events.emit('replicated', address);
            this.chluIpfs.room.broadcast({ type: constants.eventTypes.replicated, address })
                .catch(err => this.chluIpfs.logger.error('Broadcast failed: ' + err.message));
        });
        db.events.on('replicate', address => {
            this.chluIpfs.logger.debug('OrbitDB Event: Replicate ' + address);
            this.chluIpfs.events.emit('replicate', address);
        });
        db.events.on('replicate.progress', (address, hash, entry, progress) => {
            this.chluIpfs.logger.debug('OrbitDB Event: Replicate Progress ' + progress + ' for address ' + address);
            this.chluIpfs.events.emit('replicate.progress', address, hash, entry, progress);
        });
        db.events.on('ready', () => this.chluIpfs.logger.debug('OrbitDB Event: Ready'));
        db.events.on('write', () => this.chluIpfs.logger.debug('OrbitDB Event: Write'));
        db.events.on('load', () => this.chluIpfs.logger.debug('OrbitDB Event: Load'));
        db.events.on('load.progress', (address, hash, entry, progress, total) => {
            this.chluIpfs.logger.debug('OrbitDB Event: Load Progress ' + progress + '/' + total + ' for address ' + address);
        });
    }

}

module.exports = DB;