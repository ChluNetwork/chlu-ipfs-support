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
                this.chluIpfs.logger.error('Service Node Pinning failed due to Error: ' + error.message);
            }
        };
        this.replicatedNotifier = async address => {
            try {
                await this.chluIpfs.room.broadcast({
                    type: constants.eventTypes.replicated,
                    address
                });
                this.chluIpfs.logger.info('Database replicated');
            } catch (error) {
                this.chluIpfs.logger.warn('Could not send Service Node message due to Error: ' + error.message);
            }
        };
        this.replicatingNotifier = async address => {
            try {
                await this.chluIpfs.room.broadcast({
                    type: constants.eventTypes.replicating,
                    address
                });
            } catch (error) {
                this.chluIpfs.logger.warn('Could not send Service Node message due to Error: ' + error.message);
            }
        };
        // Handle Chlu network messages
        this.chluIpfs.events.on('message', this.handler);
        // Pin public keys
        this.chluIpfs.events.on('vendor pubkey', this.pinner);
        this.chluIpfs.events.on('vendor-marketplace pubkey', this.pinner);
        this.chluIpfs.events.on('marketplace pubkey', this.pinner);
        this.chluIpfs.events.on('customer pubkey', this.pinner);
        // Send messages on replication
        this.chluIpfs.events.on('replicate', this.replicatingNotifier);
        this.chluIpfs.events.on('replicated', this.replicatedNotifier);
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
        // handle ReviewRecord: pin hash
        if (obj.type === constants.eventTypes.wroteReviewRecord && typeof obj.multihash === 'string') {
            this.chluIpfs.logger.info('Reading and Pinning ReviewRecord ' + obj.multihash);
            try {
                // Read review record first. This caches the content, the history, and throws if it's not valid
                this.chluIpfs.logger.debug('Reading and validating ReviewRecord ' + obj.multihash);
                if(obj.bitcoinNetwork !== this.chluIpfs.bitcoin.getNetwork()) {
                    throw new Error(
                        'Review Record ' + obj.multihash + ' with txId ' + obj.bitcoinTransactionHash
                        + ' had bitcoin network ' + obj.bitcoinNetwork
                        + ' (expected ' + this.chluIpfs.bitcoin.getNetwork() + ')'
                    );
                }
                const reviewRecord = await this.chluIpfs.readReviewRecord(obj.multihash, {
                    bitcoinTransactionHash: obj.bitcoinTransactionHash
                });
                if (!reviewRecord.previous_version_multihash && !obj.bitcoinTransactionHash) {
                    throw new Error('Review Record ' + obj.multihash + ' was valid but had no matching transaction and was not an update');
                }
                this.chluIpfs.logger.debug('Pinning validated ReviewRecord ' + obj.multihash);
                await this.chluIpfs.pinning.pin(obj.multihash);
                this.chluIpfs.logger.info('Validated and Pinned ReviewRecord ' + obj.multihash);
            } catch(exception){
                this.chluIpfs.logger.error('Pinning failed due to Error: ' + exception.message);
            }
        }
    }
}

module.exports = ServiceNode;