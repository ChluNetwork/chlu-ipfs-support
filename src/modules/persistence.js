const constants = require('../constants');

class Persistence {

    constructor(chluIpfs){
        this.chluIpfs = chluIpfs;
    }

    async persistData() {
        if (this.chluIpfs.enablePersistence) {
            const data = {};
            if (this.chluIpfs.type === constants.types.customer) {
                // Customer OrbitDB Address
                data.orbitDbAddress = this.chluIpfs.getOrbitDBAddress();
                // Customer multihash of last review record created
                data.lastReviewRecordMultihash = this.chluIpfs.lastReviewRecordMultihash;
            } else if (this.chluIpfs.type === constants.types.service) {
                // Service Node Synced OrbitDB addresses
                data.orbitDbAddresses = Object.keys(this.chluIpfs.orbitDb.dbs);
            }
            this.chluIpfs.logger.debug('Saving persisted data');
            try {
                await this.chluIpfs.storage.save(this.chluIpfs.directory, data, this.chluIpfs.type);
            } catch (error) {
                this.chluIpfs.logger.error('Could not write data: ' + error.message || error);
            }
            this.chluIpfs.events.emit('saved');
            this.chluIpfs.logger.debug('Saved persisted data');
        } else {
            this.chluIpfs.logger.debug('Not persisting data, persistence disabled');
        }
    }

    async loadPersistedData() {
        if (this.chluIpfs.enablePersistence) {
            this.chluIpfs.logger.debug('Loading persisted data');
            const data = await this.chluIpfs.storage.load(this.chluIpfs.directory, this.chluIpfs.type);
            if (this.chluIpfs.type === constants.types.service) {
                // Open known OrbitDBs so that we can seed them
                if (data.orbitDbAddresses) await this.chluIpfs.orbitDb.openDbs(data.orbitDbAddresses);
            }
            if (data.orbitDbAddress) await this.chluIpfs.orbitDb.openPersonalOrbitDB(data.orbitDbAddress);
            if (data.lastReviewRecordMultihash) this.chluIpfs.lastReviewRecordMultihash = data.lastReviewRecordMultihash;
            this.chluIpfs.events.emit('loaded');
            this.chluIpfs.logger.debug('Loaded persisted data');
        } else {
            this.chluIpfs.logger.debug('Not loading persisted data, persistence disabled');
        }
    }

}

module.exports = Persistence;