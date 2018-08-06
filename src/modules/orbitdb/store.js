const IPFSUtils = require('../../utils/ipfs');
const Store = require('orbit-db-store');
const ChluAbstractIndex = require('./indexes/abstract');
const DIDIPFSHelper = require('../didIpfsHelper')

const version = 1;

class ChluStore extends Store {

    constructor(ipfs, id, dbname, options) {
        if (!options) options = {};
        super(ipfs, id, dbname, options);
        this._index.chluIpfs = options.chluIpfs
        if (this._index._version !== version) {
            throw new Error('Incompatible Index version');
        }
    }

    addReviewRecord(multihash, authorDidId, subjectDidId, bitcoinTransactionHash, bitcoinNetwork) {
        IPFSUtils.validateMultihash(multihash);
        const operation = {
            op: ChluAbstractIndex.operations.ADD_REVIEW_RECORD,
            multihash,
            authorDidId,
            subjectDidId,
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

    putDID(didId, multihash, signature) {
        if (!DIDIPFSHelper.isDIDID(didId)) throw new Error('DID ID invalid')
        return this._addOperation({
            op: ChluAbstractIndex.operations.PUT_DID,
            didId,
            multihash,
            signature,
            version
        })
    }

    getDID(didId) {
        return this._index.getDID(didId)
    }

    getReviewRecordList() {
        return this._index.getReviewRecordList(...arguments);
    }

    getReviewsAboutDID() {
        return this._index.getReviewsAboutDID(...arguments)
    }

    getReviewsWrittenByDID() {
        return this._index.getReviewsWrittenByDID(...arguments)
    }

    getReviewRecordMetadata(multihash) {
        return this._index.getReviewRecordMetadata(multihash);
    }

    getLatestReviewRecordUpdate(multihash) {
        return this._index.getLatestReviewRecordUpdate(multihash);
    }

}

module.exports = Object.assign(ChluStore, { type: 'chlu', version });