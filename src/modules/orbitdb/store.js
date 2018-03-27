const IPFSUtils = require('../../utils/ipfs');
const Store = require('orbit-db-store');
const ChluIndex = require('./db-index');

const version = ChluIndex.version;

class ChluStore extends Store {

    constructor(ipfs, id, dbname, options) {
        if (!options) options = {};
        if (!options.Index) Object.assign(options, { Index: ChluIndex });
        super(ipfs, id, dbname, options);
    }

    addReviewRecord(multihash) {
        IPFSUtils.validateMultihash(multihash);
        // TODO: more checks
        return this._addOperation({
            op: ChluIndex.operations.ADD_REVIEW_RECORD,
            multihash,
            version
        });
    }

    updateReviewRecord(multihash, previousVersionMultihash) {
        IPFSUtils.validateMultihash(multihash);
        IPFSUtils.validateMultihash(previousVersionMultihash);
        // TODO: more checks
        return this._addOperation({
            op: ChluIndex.operations.UPDATE_REVIEW_RECORD,
            multihash,
            previousVersionMultihash,
            version
        });
    }

    getReviewRecordList() {
        return this._index.getReviewRecordList();
    }

    getLatestReviewRecordUpdate(multihash) {
        return this._index.getLatestReviewRecordUpdate(multihash);
    }

}

module.exports = Object.assign(ChluStore, { type: 'chlu', version });