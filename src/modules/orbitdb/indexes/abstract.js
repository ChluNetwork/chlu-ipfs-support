const IPFSUtils = require('../../../utils/ipfs');
const { get } = require('lodash')

const version = 1;

class ChluAbstractIndex {
    constructor(indexVersion){
        this._version = indexVersion;
        if (this._version !== version) {
            throw new Error('Incompatible version');
        }
        this.enableValidations = true
        this.enableWrites = true
    }

    async getAndValidateReviewRecordContent(multihash, bitcoinTransactionHash) {
        const reviewRecord = await this.chluIpfs.reviewRecords.readReviewRecord(multihash, {
            getLatestVersion: false,
            readTimeout: 1000,
            validate: {
                throwErrors: false
            },
            bitcoinTransactionHash
        })
        return reviewRecord
    }

    async getAndValidatePublicDIDDocument(multihash, signature) {
        const validSignature = await this.chluIpfs.didIpfsHelper.verifyMultihashWithDIDDocumentMultihash(multihash, multihash, signature)
        if (validSignature) {
            return await this.chluIpfs.didIpfsHelper.readPublicDIDDocument(multihash)
        } else {
            throw new Error('Invalid DID Document')
        }
    }

    /**
     * Called by OrbitDB to update the index 
     */
    async updateIndex(oplog) {
        if (this.enableValidations || this.enableWrites) {
            for (const item of oplog.values.slice()) {
                // Skip operations from a different chlu store version
                // TODO: handle errors
                if (item.payload.version === this._version) {
                    // TODO: check update validity, RR validity if possible
                    if (item.payload.op === operations.ADD_REVIEW_RECORD) {
                        try {
                            const reviewRecord = await this.getAndValidateReviewRecordContent(item.payload.multihash)
                            // TODO retry if validation failed 
                            if (this.enableWrites) {
                                const subjectDidId = get(reviewRecord, 'popr.vendor_did', get(reviewRecord, 'subject.did', null)) || null // force empty string to null
                                const authorDidId = get(reviewRecord, 'customer_signature.creator', null)
                                await this.addReviewRecord({
                                    multihash: item.payload.multihash,
                                    reviewRecord,
                                    bitcoinTransactionHash: item.payload.bitcoinTransactionHash || null,
                                    authorDidId,
                                    subjectDidId
                                });
                            }
                            this.chluIpfs.events.emit('discover/reviewrecord', item.payload.multihash);
                        } catch (error) {
                            this.chluIpfs.logger.error(`Error while updating ChluDB Index: ${error.message}`)
                            console.log(error)
                        }
                    } else if (item.payload.op === operations.PUT_DID) {
                        try {
                            const publicDidDocument = await this.getAndValidatePublicDIDDocument(item.payload.multihash, item.payload.signature)
                            if (this.enableWrites) {
                                await this.putDID(publicDidDocument, item.payload.multihash)
                            }
                            this.chluIpfs.events.emit('discover/did', publicDidDocument.id);
                        } catch (error) {
                            this.chluIpfs.logger.error(`Error while updating ChluDB Index: ${error.message}`)
                            console.log(error)
                        }
                    }
                }
            }
        }
    }

    async start() {
        this.enableWrites = get(this.options, 'enableWrites', true)
        this.enableValidations = get(this.options, 'enableValidations', true)
        this.chluIpfs.logger.debug(`Setting up OrbitDB Index Options: enableWrites=${this.enableWrites} enableValidations=${this.enableValidations}`)
    }

    async stop() {
    }

    async clear() {
    }
    
    // Review records

    async addReviewRecord(options) {
        return await this._addReviewRecord(options);
    }

    async getLatestReviewRecordUpdate(multihash) {
        IPFSUtils.validateMultihash(multihash);
        return await this._getLatestReviewRecordUpdate(multihash) || multihash;
    }

    async getReviewRecordList(offset = 0, limit = 0) {
        return await this._getReviewRecordList(offset, limit);
    }

    async getOriginalReviewRecord(updatedMultihash) {
        IPFSUtils.validateMultihash(updatedMultihash);
        return await this._getOriginalReviewRecord(updatedMultihash) || updatedMultihash;
    }

    async getReviewRecordMetadata(multihash) {
        IPFSUtils.validateMultihash(multihash);
        return await this._getReviewRecordMetadata(multihash);
    }

    async getReviewRecordCount() {
        return await this._getReviewRecordCount();
    }

    async _addReviewRecord() {
        notImplemented();
    }

    async _getLatestReviewRecordUpdate() {
        notImplemented();
    }

    async _getOriginalReviewRecord() {
        notImplemented();
    }

    async _getReviewRecordMetadata() {
        notImplemented();
    }

    async _getReviewRecordList() {
        notImplemented();
    }

    async _getReviewRecordCount() {
        notImplemented();
    }

    // DID

    // TODO: all kinds of checks on multihashes and DID ID's

    async getDID(didId) {
        return await this._getDID(didId)
    }

    async putDID(publicDidDocument, didDocumentMultihash) {
        return await this._putDID(publicDidDocument, didDocumentMultihash)
    }

    async _putDID() {
        notImplemented();
    }

    async _getDID() {
        notImplemented();
    }

    // DID and Reviews

    async getReviewsAboutDID(didId) {
        return await this._getReviewsAboutDID(didId)
    }

    async getReviewsWrittenByDID(didId) {
        return await this._getReviewsWrittenByDID(didId)
    }

    async _getReviewsAboutDID() {
        notImplemented();
    }

    async _getReviewsWrittenByDID() {
        notImplemented();
    }

}

function notImplemented() {
    throw new Error('Abstract method is not implemented');
}

const operations = {
    ADD_REVIEW_RECORD: 'ADD_REVIEW_RECORD',
    PUT_DID: 'PUT_DID'
};

module.exports = Object.assign(ChluAbstractIndex, { operations, version });

