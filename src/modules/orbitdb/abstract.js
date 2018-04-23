const IPFSUtils = require('../../utils/ipfs');

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
                            bitcoinTransactionHash: item.payload.bitcoinTransactionHash
                        });
                    } else if (item.payload.op === operations.UPDATE_REVIEW_RECORD && IPFSUtils.isValidMultihash(item.payload.multihash) && IPFSUtils.isValidMultihash(item.payload.previousVersionMultihash)) {
                        // TODO: check that whatever is being updated is in the DB
                        // the multihash to be updated might already be an update. Be careful!
                        const from = this.getLatestReviewRecordUpdate(item.payload.previousVersionMultihash);
                        this.addReviewRecordUpdate({
                            fromMultihash: from,
                            toMultihash: item.payload.multihash
                        });
                    }
                }
            });
    }

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

    getReviewRecordList() {
        return this._getReviewRecordList();
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

    _getReviewRecordList() {
        notImplemented();
    }

}

function notImplemented() {
    throw new Error('Abstract method is not implemented');
}

const operations = {
    ADD_REVIEW_RECORD: 'ADD_REVIEW_RECORD',
    UPDATE_REVIEW_RECORD: 'UPDATE_REVIEW_RECORD'
};

module.exports = Object.assign(ChluAbstractIndex, { operations, version });

