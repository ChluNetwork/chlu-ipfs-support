const constants = require('../constants');
const OrbitDB = require('orbit-db');

class DB {

    constructor(chluIpfs){
        this.chluIpfs = chluIpfs;
        this.dbs = {};
        this.db = null;
    }

    getPersonalDBAddress(){
        return this.db ? this.db.address.toString() : null;
    }

    async start() {
        if (!this.orbitDb) {
            this.chluIpfs.logger.debug('Initializing OrbitDB with directory ' + this.chluIpfs.orbitDbDirectory);
            this.orbitDb = new OrbitDB(this.chluIpfs.ipfs, this.chluIpfs.orbitDbDirectory);
            this.chluIpfs.logger.debug('Initialized OrbitDB with directory ' + this.chluIpfs.orbitDbDirectory);
        }
    }

    async stop() {
        if (this.orbitDb) await this.orbitDb.stop();
    }

    async openPersonalOrbitDB(address = null) {
        if (address){
            // Open previously created Customer Review Update DB
            this.chluIpfs.logger.debug('Opening existing Personal OrbitDB');
            this.db = await this.openDb(address);
            if (this.db) this.chluIpfs.logger.debug('Opened existing Personal OrbitDB');
        } else {
            this.db = await this.openDb(constants.customerDbName);
            this.chluIpfs.logger.debug('Created Personal OrbitDB');
        }
        return this.db;
    }

    async openDb(address) {
        this.chluIpfs.logger.debug('Opening ' + address);
        let db;
        try {
            db = await this.orbitDb.kvstore(address);
            this.listenToDBEvents(db);
            await db.load();
            this.chluIpfs.logger.debug('Opened ' + address);
        } catch (error) {
            this.chluIpfs.logger.error('Coud not Open ' + address + ': ' + error.message || error);
        }
        return db;
    }

    async openDbForReplication(address) {
        if (!this.dbs[address]) {
            this.dbs[address] = await this.openDb(address);
            // Make sure this DB address does not get lost
            if (this.dbs[address]) await this.chluIpfs.persistence.persistData();
        }
        return this.dbs[address];
    }

    async openDbs(addresses) {
        this.chluIpfs.logger.debug('Opening ' + addresses.length + ' OrbitDBs');
        for(const address of addresses) {
            this.dbs[address] = await this.openDb(address);
        }
        this.chluIpfs.logger.debug('Opened all persisted OrbitDBs');
    }

    async replicate(address) {
        this.chluIpfs.logger.info('Replicating ' + address);
        const db = await this.openDbForReplication(address);
        if (db) {
            this.chluIpfs.room.broadcast({ type: constants.eventTypes.replicating, address });
            await new Promise(fullfill => {
                this.chluIpfs.logger.debug('Waiting for next replication of ' + address);
                db.events.once('replicated', fullfill);
                db.events.once('ready', fullfill);
            });
            this.chluIpfs.room.broadcast({ type: constants.eventTypes.replicated, address });
            this.chluIpfs.logger.info('Replicated ' + address);
        }
    }

    listenToDBEvents(db){
        db.events.on('replicated', address => {
            this.chluIpfs.logger.debug('OrbitDB Event: Replicated ' + address);
        });
        db.events.on('replicate', address => {
            this.chluIpfs.logger.debug('OrbitDB Event: Replicate ' + address);
        });
        db.events.on('replicate.progress', (address, hash, entry, progress) => {
            this.chluIpfs.logger.debug('OrbitDB Event: Replicate Progress ' + progress + ' for address ' + address);
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