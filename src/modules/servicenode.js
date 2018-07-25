const constants = require('../constants');
const { isEmpty } = require('lodash')

class ServiceNode {
    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
    }

    async start() {
        this.chluIpfs.logger.debug('Starting Service Node')
        const self = this;
        this.handler = message => {
            return self.handleMessage(message);
        };
        this.didPinner = async didId => {
            try {
                const multihash = await this.chluIpfs.orbitDb.getDID(didId)
                if (multihash) {
                    await this.pinner(multihash)
                } else {
                    throw new Error(`Cannot Pin DID ${didId}: not found`)
                }
            } catch (error) {
                this.chluIpfs.logger.error(`Could not Pin DID ${didId} due to Error: ${error.message}`)
            }
        }
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
        this.chluIpfs.events.on('pubsub/message', this.handler);
        // Pin DIDs and public keys
        this.chluIpfs.events.on('discover/did/customer', this.didPinner);
        this.chluIpfs.events.on('discover/did/issuer', this.didPinner);
        this.chluIpfs.events.on('discover/did/vendor', this.didPinner);
        this.chluIpfs.events.on('discover/did/marketplace', this.didPinner);
        this.chluIpfs.events.on('discover/keys/vendor-marketplace', this.pinner);
        // Send messages on replication
        this.chluIpfs.events.on('db/replicated', this.replicatedNotifier);
        this.chluIpfs.logger.debug('Started Service Node')
    }

    async stop() {
        if (this.handler) {
            this.chluIpfs.events.removeListener('pubsub/message', this.handler);
            this.handler = undefined;
        }
    }

    async handleMessage(message) {
        let obj = message;
        // handle ReviewRecord: pin hash
        if (obj.type === constants.eventTypes.wroteReviewRecord && typeof obj.multihash === 'string') {
            this.chluIpfs.logger.info('Reading and Pinning ReviewRecord ' + obj.multihash);
            try {
                // Read review record first. This caches the content, the history, and throws if it's not valid
                this.chluIpfs.logger.debug('Reading and validating ReviewRecord ' + obj.multihash);
                if(!isEmpty(obj.bitcoinNetwork) && obj.bitcoinNetwork !== this.chluIpfs.bitcoin.getNetwork()) {
                    throw new Error(
                        'Review Record ' + obj.multihash + ' with txId ' + obj.bitcoinTransactionHash
                        + ' had bitcoin network ' + obj.bitcoinNetwork
                        + ' (expected ' + this.chluIpfs.bitcoin.getNetwork() + ')'
                    );
                }
                await this.chluIpfs.readReviewRecord(obj.multihash, {
                    bitcoinTransactionHash: obj.bitcoinTransactionHash
                });
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