const IPFSUtils = require('../../utils/ipfs');
const Store = require('orbit-db-store');
const ChluAbstractIndex = require('./abstract');
const ChluInMemoryIndex = require('./inmemory');

const version = 0;

class ChluStore extends Store {

    constructor(ipfs, id, dbname, options) {
        if (!options) options = {};
        if (!options.Index) Object.assign(options, { Index: ChluInMemoryIndex });
        super(ipfs, id, dbname, options);
        if (this._index._version !== version) {
            throw new Error('Incompatible Index version');
        }
    }

    addReviewRecord(multihash, bitcoinTransactionHash, bitcoinNetwork) {
        IPFSUtils.validateMultihash(multihash);
        const operation = {
            op: ChluAbstractIndex.operations.ADD_REVIEW_RECORD,
            multihash,
            version
        };
        if (bitcoinTransactionHash) {
            operation.bitcoinTransactionHash = bitcoinTransactionHash;
            operation.bitcoinNetwork = bitcoinNetwork;
        }
        // TODO: more checks
        return this._addOperation(operation);
    }

    updateReviewRecord(multihash, previousVersionMultihash) {
        IPFSUtils.validateMultihash(multihash);
        IPFSUtils.validateMultihash(previousVersionMultihash);
        // TODO: more checks
        return this._addOperation({
            op: ChluAbstractIndex.operations.UPDATE_REVIEW_RECORD,
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