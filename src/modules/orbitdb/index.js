const constants = require('../../constants');
const OrbitDB = require('orbit-db');
const DefaultChluStore = require('./store');
const { get } = require('lodash')
const ChluInMemoryIndex = require('./indexes/inmemory')
const ChluNOOPIndex = require('./indexes/noop')

const Indexes = {
    'InMemory': ChluInMemoryIndex,
    'NOOP': ChluNOOPIndex,
}

class DB {

    constructor(chluIpfs, Index = 'InMemory', indexOptions = {}){
        this.chluIpfs = chluIpfs;
        this.Index = typeof Index === 'string' ? Indexes[Index] : Index
        if (!this.Index) throw new Error('Invalid OrbitDB Index')
        this.indexOptions = indexOptions
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
        if (!this.db) await this.open();
    }

    getAddress() {
        return this.db.address.toString();
    }

    async stop() {
        this.chluIpfs.logger.debug('Stopping OrbitDB Module');
        if (this.db) {
            const dbIndex = this.db._index
            await this.db.close();
            if (typeof dbIndex.stop === 'function') await dbIndex.stop()
        }
        if (this.orbitDb) await this.orbitDb.stop();
        this.chluIpfs.logger.debug('Stopped OrbitDB Module');
    }

    async getReviewRecordList() {
        return await this.db.getReviewRecordList();
    }

    async getReviewsAboutDID(did, offset, limit) {
        return await this.db.getReviewsAboutDID(did, offset, limit)
    }

    async getReviewsWrittenByDID(did, offset, limit) {
        return await this.db.getReviewsWrittenByDID(did, offset, limit)
    }

    async getReviewRecordMetadata(multihash) {
        return await this.db.getReviewRecordMetadata(multihash);
    }

    /**
     * Get the last review record update for the given multihash
     */
    async getLatestReviewRecordUpdate(multihash) {
        return await this.db.getLatestReviewRecordUpdate(multihash) || multihash;
    }

    async putReviewRecord(multihash, txId = null, bitcoinNetwork = null) {
        this.chluIpfs.logger.debug('Writing to OrbitDB: Review Record ' + multihash + (txId ? (' with txId ' + txId) : ''));
        await this.db.addReviewRecord(multihash, txId, bitcoinNetwork);
    }

    async putReviewRecordAndWaitForReplication(multihash, ...args) {
        this.chluIpfs.logger.debug('Preparing to wait for remote OrbitDB Replication before Write');
        await new Promise((resolve, reject) => {
            this.chluIpfs.events.once(constants.eventTypes.pinned + '_' + multihash, () => resolve());
            this.putReviewRecord(multihash, ...args).catch(reject);
        });
        this.chluIpfs.logger.debug('Remote replication event received: OrbitDB Write operation Done');
    }

    async putDID(didDocumentMultihash, signature) {
        this.chluIpfs.logger.debug(`Writing DID to OrbitDB: ${didDocumentMultihash}`)
        // TODO: verify signature here?
        return await this.db.putDID( didDocumentMultihash, signature)
    }

    async putDIDAndWaitForReplication(didDocumentMultihash, ...args) {
        this.chluIpfs.logger.debug('Preparing to wait for remote OrbitDB Replication before Write');
        await new Promise((resolve, reject) => {
            this.chluIpfs.events.once(constants.eventTypes.pinned + '_' + didDocumentMultihash, () => resolve());
            this.putDID(didDocumentMultihash, ...args).catch(reject);
        });
        this.chluIpfs.logger.debug('Remote replication event received: OrbitDB Write operation Done');
    }

    async getDID(didId, waitUntilPresent = false) {
        let result = null, firstTry = true
        this.chluIpfs.logger.info(`getDID (OrbitDB) ${didId} => ...`)
        while(!get(result, 'multihash') && (firstTry || waitUntilPresent)) {
            firstTry = false
            result = await this.db.getDID(didId)
            const multihash = get(result, 'multihash')
            if (!multihash && waitUntilPresent) {
                this.chluIpfs.logger.info(`getDID ${didId} waiting (not in OrbitDB)...`)
                // wait for replication/write then try again
                await new Promise(resolve => {
                    this.chluIpfs.events.once('db/replicated', address => {
                        if (address === this.getAddress()) resolve()
                    })
                    this.chluIpfs.events.once('db/write', address => {
                        if (address === this.getAddress()) resolve()
                    })
                })
                this.chluIpfs.logger.info(`getDID ${didId} OrbitDB has been updated, trying again...`)
            }
        }
        this.chluIpfs.logger.info(`getDID (OrbitDB) ${didId} => ${result.multihash}`)
        return result
    }

    async open() {
        this.chluIpfs.logger.debug('Opening Chlu OrbitDB');
        this.dbName = this.chluIpfs.network ? ('chlu-' + this.chluIpfs.network) : 'chlu';
        this.chluIpfs.logger.debug('Using OrbitDB type ' + this.ChluStore.type + ' named ' + this.dbName);
        this.db = await this.orbitDb.open(this.dbName, {
            type: this.ChluStore.type,
            create: true,
            write: ['*'],
            Index: this.Index,
            chluIpfs: this.chluIpfs,
            indexOptions: this.indexOptions
        });
        this.listenToDBEvents(this.db);
        this.chluIpfs.logger.debug('Starting Chlu OrbitDB Index');
        await this.db._index.start()
        this.chluIpfs.logger.debug('Loading Chlu OrbitDB cache');
        await this.db.load();
        this.chluIpfs.logger.debug('Chlu OrbitDB fully ready');
        return this.db;
    }

    listenToDBEvents(db){
        db.events.on('replicated', address => {
            this.chluIpfs.logger.debug('OrbitDB Event: Replicated ' + address);
            this.chluIpfs.events.emit('db/replicated', address);
            this.chluIpfs.room.broadcast({ type: constants.eventTypes.replicated, address })
                .catch(err => this.chluIpfs.logger.error('Broadcast failed: ' + err.message));
        });
        db.events.on('replicate', address => {
            this.chluIpfs.logger.debug('OrbitDB Event: Replicate ' + address);
            this.chluIpfs.events.emit('db/replicate', address);
        });
        db.events.on('replicate.progress', (address, hash, entry, progress, have) => {
            this.chluIpfs.logger.debug('OrbitDB Event: Replicate Progress ' + progress + ' for address ' + address);
            this.chluIpfs.events.emit('db/replicate/progress', address, hash, entry, progress, have);
        });
        db.events.on('ready', () => this.chluIpfs.logger.debug('OrbitDB Event: Ready'));
        db.events.on('write', () => this.chluIpfs.logger.debug('OrbitDB Event: Write'));
        db.events.on('load', () => this.chluIpfs.logger.debug('OrbitDB Event: Load'));
        db.events.on('load.progress', (address, hash, entry, progress, total) => {
            this.chluIpfs.logger.debug('OrbitDB Event: Load Progress ' + progress + '/' + total + ' for address ' + address);
            this.chluIpfs.events.emit('db/load/progress', address, hash, entry, progress, total);
        });
    }

}

module.exports = Object.assign(DB, { Indexes });