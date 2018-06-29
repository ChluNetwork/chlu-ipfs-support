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
    updateIndex(oplog) {
        oplog.values
            .slice()
            .forEach(item => {
                // Skip operations from a different chlu store version
                // TODO: handle errors
                if (item.payload.version === this._version) {
                    // TODO: check update validity, RR validity if possible
                    if (item.payload.op === operations.ADD_REVIEW_RECORD && IPFSUtils.isValidMultihash(item.payload.multihash)) {
                        this.addOriginalReviewRecord({
                            multihash: item.payload.multihash,
                            didId: item.payload.didId,
                            bitcoinTransactionHash: item.payload.bitcoinTransactionHash
                        });
                    } else if (item.payload.op === operations.UPDATE_REVIEW_RECORD) {
                        if (IPFSUtils.isValidMultihash(item.payload.multihash) && IPFSUtils.isValidMultihash(item.payload.previousVersionMultihash)) {
                            // TODO: check that whatever is being updated is in the DB
                            // the multihash to be updated might already be an update. Be careful!
                            const from = this.getLatestReviewRecordUpdate(item.payload.previousVersionMultihash);
                            this.addReviewRecordUpdate({
                                fromMultihash: from,
                                toMultihash: item.payload.multihash
                            });
                        }
                    } else if (item.payload.op === operations.PUT_DID) {
                        if (DID.isDIDID(item.payload.didId) && IPFSUtils.isValidMultihash(item.payload.multihash)) {
                            // TODO: check signature
                            this.putDID(item.payload.didId, item.payload.multihash, item.payload.signature)
                        }
                    }
                }
            });
    }
    
    // Review records

    addOriginalReviewRecord(obj) {
        IPFSUtils.validateMultihash(obj.multihash);
        return this._addOriginalReviewRecord(obj);
    }

    addReviewRecordUpdate(obj) {
        IPFSUtils.validateMultihash(obj.fromMultihash);
        IPFSUtils.validateMultihash(obj.toMultihash);
        return this._addReviewRecordUpdate(obj);
    }

    getLatestReviewRecordUpdate(multihash) {
        IPFSUtils.validateMultihash(multihash);
        return this._getLatestReviewRecordUpdate(multihash) || multihash;
    }

    getReviewRecordList(offset = 0, limit = 0) {
        return this._getReviewRecordList(offset, limit);
    }

    getOriginalReviewRecord(updatedMultihash) {
        IPFSUtils.validateMultihash(updatedMultihash);
        return this._getOriginalReviewRecord(updatedMultihash) || updatedMultihash;
    }

    getReviewRecordMetadata(multihash) {
        IPFSUtils.validateMultihash(multihash);
        return this._getReviewRecordMetadata(multihash);
    }

    getReviewRecordCount() {
        return this._getReviewRecordCount();
    }

    _addOriginalReviewRecord() {
        notImplemented();
    }

    _addReviewRecordUpdate() {
        notImplemented();
    }

    _getLatestReviewRecordUpdate() {
        notImplemented();
    }

    _getOriginalReviewRecord() {
        notImplemented();
    }

    _getReviewRecordMetadata() {
        notImplemented();
    }

    _getReviewRecordList() {
        notImplemented();
    }

    _getReviewRecordCount() {
        notImplemented();
    }

    // DID

    // TODO: all kinds of checks on multihashes and DID ID's

    getDID(didId) {
        return this._getDID(didId)
    }

    putDID(didId, didDocumentMultihash, signature) {
        return this._putDID(didId, didDocumentMultihash, signature)
    }

    _putDID() {
        notImplemented();
    }

    _getDID() {
        notImplemented();
    }

    // DID and Reviews

    getReviewsByDID(didId) {
        return this._getReviewsByDID(didId)
    }

    _getReviewsByDID() {
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

