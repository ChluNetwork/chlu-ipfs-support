const constants = require('../constants');

class ServiceNode {
    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
    }

    async start() {
        const self = this;
        this.handler = message => {
            return self.handleMessage(message);
        };
        this.pinner = async multihash => {
            try {
                this.chluIpfs.pinning.pin(multihash);
            } catch (error) {
                this.chluIpfs.logger.error('Pinning failed due to Error: ' + error.message);
            }
        };
        // Handle Chlu network messages
        this.chluIpfs.events.on('message', this.handler);
        // Pin public keys
        this.chluIpfs.events.on('vendor pubkey', this.pinner);
        this.chluIpfs.events.on('vendor-marketplace pubkey', this.pinner);
        this.chluIpfs.events.on('marketplace pubkey', this.pinner);
        this.chluIpfs.events.on('customer pubkey', this.pinner);
    }

    async stop() {
        if (this.handler) {
            this.chluIpfs.events.removeListener('message', this.handler);
            this.handler = undefined;
        }
        if (this.chluIpfs.dbs) {
            await Promise.all(Object.values(this.chluIpfs.dbs).map(db => db.close()));
        }
        this.chluIpfs.dbs = {};
    }

    async handleMessage(message) {
        let obj = message;
        const isOrbitDb = obj.type === constants.eventTypes.customerReviews || obj.type === constants.eventTypes.updatedReview;
        // handle ReviewRecord: pin hash
        if (obj.type === constants.eventTypes.wroteReviewRecord && typeof obj.multihash === 'string') {
            this.chluIpfs.logger.info('Reading and Pinning ReviewRecord ' + obj.multihash);
            try {
                // Read review record first. This caches the content, the history, and throws if it's not valid
                this.chluIpfs.logger.debug('Reading and validating ReviewRecord ' + obj.multihash);
                await this.chluIpfs.readReviewRecord(obj.multihash, {
                    checkForUpdates: true
                });
                this.chluIpfs.logger.debug('Pinning validated ReviewRecord ' + obj.multihash);
                await this.chluIpfs.pinning.pin(obj.multihash);
                this.chluIpfs.logger.info('Validated and Pinned ReviewRecord ' + obj.multihash);
            } catch(exception){
                this.chluIpfs.logger.error('Pinning failed due to Error: ' + exception.message);
            }
        } else if (isOrbitDb && typeof obj.address === 'string') {
            // handle OrbitDB: replicate
            try {
                this.chluIpfs.orbitDb.replicate(obj.address);
            } catch(exception){
                this.chluIpfs.logger.error('OrbitDB Replication Error: ' + exception.message);
            }
        }
    }
}

module.exports = ServiceNode;