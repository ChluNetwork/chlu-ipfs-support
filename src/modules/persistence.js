const constants = require('../constants');
const IPFSUtils = require('../utils/ipfs');

class Persistence {

    constructor(chluIpfs){
        this.chluIpfs = chluIpfs;
    }

    async persistData() {
        if (this.chluIpfs.enablePersistence) {
            const data = {};
            if (this.chluIpfs.type === constants.types.customer) {
                // Customer multihash of last review record created
                if (IPFSUtils.isValidMultihash(this.chluIpfs.lastReviewRecordMultihash)) {
                    data.lastReviewRecordMultihash = this.chluIpfs.lastReviewRecordMultihash;
                }
                // Customer keys
                data.keyPair = await this.chluIpfs.crypto.exportKeyPair();
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
            if (IPFSUtils.isValidMultihash(data.lastReviewRecordMultihash)) {
                this.chluIpfs.lastReviewRecordMultihash = data.lastReviewRecordMultihash;
            }
            if (data.keyPair) {
                this.chluIpfs.crypto.keyPair = await this.chluIpfs.crypto.importKeyPair(data.keyPair);
            }
            this.chluIpfs.events.emit('loaded');
            this.chluIpfs.logger.debug('Loaded persisted data');
        } else {
            this.chluIpfs.logger.debug('Not loading persisted data, persistence disabled');
        }
    }

}

module.exports = Persistence;