const IPFSUtils = require('../../utils/ipfs');
const DID = require('../did')

const version = 0;

class ChluAbstractIndex {
    constructor(index, indexVersion){
        this._index = index;
        this._version = indexVersion;
        if (this._version !== version) {
            throw new Error('Incompatible version');
        }
    }

    /**
     * Called by OrbitDB to update the index 
     */
    async updateIndex(oplog) {
        for (const item of oplog.values.slice()) {
            // Skip operations from a different chlu store version
            // TODO: handle errors
            if (item.payload.version === this._version) {
                // TODO: check update validity, RR validity if possible
                if (item.payload.op === operations.ADD_REVIEW_RECORD && IPFSUtils.isValidMultihash(item.payload.multihash)) {
                    await this.addOriginalReviewRecord({
                        multihash: item.payload.multihash,
                        subjectDidId: item.payload.subjectDidId || item.payload.didId, // Retrocompatibility
                        authorDidId: item.payload.authorDidId,
                        bitcoinTransactionHash: item.payload.bitcoinTransactionHash
                    });
                } else if (item.payload.op === operations.UPDATE_REVIEW_RECORD) {
                    if (IPFSUtils.isValidMultihash(item.payload.multihash) && IPFSUtils.isValidMultihash(item.payload.previousVersionMultihash)) {
                        // TODO: check that whatever is being updated is in the DB
                        // the multihash to be updated might already be an update. Be careful!
                        const from = await this.getLatestReviewRecordUpdate(item.payload.previousVersionMultihash);
                        await this.addReviewRecordUpdate({
                            fromMultihash: from,
                            toMultihash: item.payload.multihash
                        });
                    }
                } else if (item.payload.op === operations.PUT_DID) {
                    if (DID.isDIDID(item.payload.didId) && IPFSUtils.isValidMultihash(item.payload.multihash)) {
                        // TODO: check signature
                        await this.putDID(item.payload.didId, item.payload.multihash, item.payload.signature)
                    }
                }
            }
        }
    }
    
    // Review records

    async addOriginalReviewRecord(obj) {
        IPFSUtils.validateMultihash(obj.multihash);
        return await this._addOriginalReviewRecord(obj);
    }

    async addReviewRecordUpdate(obj) {
        IPFSUtils.validateMultihash(obj.fromMultihash);
        IPFSUtils.validateMultihash(obj.toMultihash);
        return await this._addReviewRecordUpdate(obj);
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

    async _addOriginalReviewRecord() {
        notImplemented();
    }

    async _addReviewRecordUpdate() {
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

    async putDID(didId, didDocumentMultihash, signature) {
        return await this._putDID(didId, didDocumentMultihash, signature)
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
    UPDATE_REVIEW_RECORD: 'UPDATE_REVIEW_RECORD',
    PUT_DID: 'PUT_DID'
};

module.exports = Object.assign(ChluAbstractIndex, { operations, version });

