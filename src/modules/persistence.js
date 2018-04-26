const IPFSUtils = require('../utils/ipfs');

class Persistence {

    constructor(chluIpfs){
        this.chluIpfs = chluIpfs;
    }

    async persistData() {
        if (this.chluIpfs.enablePersistence) {
            const data = {};
            data.cache = this.chluIpfs.cache.export();
            if (IPFSUtils.isValidMultihash(this.chluIpfs.lastReviewRecordMultihash)) {
                // multihash of last review record created
                data.lastReviewRecordMultihash = this.chluIpfs.lastReviewRecordMultihash;
            }
            if (this.chluIpfs.crypto.keyPair) {
                // Crypto keypair
                data.keyPair = await this.chluIpfs.crypto.exportKeyPair();
            }
            this.chluIpfs.logger.debug('Saving persisted data');
            try {
                await this.chluIpfs.storage.save(this.chluIpfs.directory, data, this.chluIpfs.type);
            } catch (error) {
                this.chluIpfs.logger.error('Could not write data: ' + error.message || error);
            }
            this.chluIpfs.events.emit('persistence/saved');
            this.chluIpfs.logger.debug('Saved persisted data');
        } else {
            this.chluIpfs.logger.debug('Not persisting data, persistence disabled');
        }
    }

    async loadPersistedData() {
        if (this.chluIpfs.enablePersistence) {
            this.chluIpfs.logger.debug('Loading persisted data');
            const data = await this.chluIpfs.storage.load(this.chluIpfs.directory, this.chluIpfs.type);
            if (IPFSUtils.isValidMultihash(data.lastReviewRecordMultihash)) {
                this.chluIpfs.lastReviewRecordMultihash = data.lastReviewRecordMultihash;
            }
            if (data.keyPair) {
                this.chluIpfs.crypto.keyPair = await this.chluIpfs.crypto.importKeyPair(data.keyPair);
            }
            if (data.cache) {
                this.chluIpfs.cache.import(data.cache);
            }
            this.chluIpfs.events.emit('persistence/loaded');
            this.chluIpfs.logger.debug('Loaded persisted data');
        } else {
            this.chluIpfs.logger.debug('Not loading persisted data, persistence disabled');
        }
    }

}

module.exports = Persistence;