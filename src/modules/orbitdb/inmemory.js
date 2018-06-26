const IPFSUtils = require('../../utils/ipfs');
const ChluAbstractIndex = require('./abstract');

const version = 0;

class ChluInMemoryIndex extends ChluAbstractIndex {
    constructor(){
        const _index = {
            verifiedReviews: {
                list: [],
                data: {}
            },
            unverifiedReviews: {
                data: {}
            },
            did: {
                data: {},
                reviewsByDid: {}
            }
        };
        super(_index, version);
    }

    _addOriginalReviewRecord(obj) {
        const list = this._index.verifiedReviews.list
        const data = this._index.verifiedReviews.data
        if (list.indexOf(obj.multihash) < 0) {
            list.splice(0, 0, obj.multihash);
            data[obj.multihash] = {
                multihash: obj.multihash,
                addedAt: getTime(),
                bitcoinTransactionHash: obj.bitcoinTransactionHash || null
            };
            // TODO: Add it to reviewsByDID
        }
    }

    _addReviewRecordUpdate(obj) {
        const data = this._index.verifiedReviews.data
        const existing = data[obj.fromMultihash];
        existing.nextVersion = obj.toMultihash;
        const nextVersionData = {
            addedAt: getTime()
        };
        nextVersionData.multihash = obj.toMultihash;
        nextVersionData.previousVersion = obj.fromMultihash;
        data[obj.fromMultihash] = existing;
        data[obj.toMultihash] = nextVersionData;
    }

    _getLatestReviewRecordUpdate(multihash) {
        return this.followPointerAcyclic(multihash, this._index.verifiedReviews.data, 'nextVersion', undefined, IPFSUtils.isValidMultihash);
    }

    _getOriginalReviewRecord(multihash) {
        return this.followPointerAcyclic(multihash, this._index.verifiedReviews.data, 'previousVersion', undefined, IPFSUtils.isValidMultihash);
    }

    followPointerAcyclic(value, kvstore, pointerName, stack = [value], validate = null) {
        const data = kvstore[value];
        if (data) {
            const next = data[pointerName];
            const valid = typeof validate === 'function' ? validate(next) : Boolean(next);
            if (valid && stack.indexOf(next) === -1) {
                // One next iteration
                return this.followPointerAcyclic(next, kvstore, pointerName, stack.concat(next));
            }
        }
        // End of search, return latest valid data
        return stack[stack.length-1];
    }

    _getReviewRecordMetadata(multihash) {
        return this._index.verifiedReviews.data[multihash] || null;
    }

    _getReviewRecordList(offset, limit) {
        return this._index.verifiedReviews.list.slice(offset, (limit > 0 ? (offset + limit) : undefined));
    }

    _getReviewRecordCount() {
        return this._index.verifiedReviews.list.length;
    }

    _putDID(didId, didDocumentMultihash) {
        this._index.did.data[didId] = didDocumentMultihash
    }

    _getDID(didId) {
        return this._index.did.data[didId] || null
    }

    _putUnverifiedReviews(didId, reviews) {
        this._index.unverifiedReviews[didId] = reviews
    }

    _getReviewsByDID(didId) {
        return this._index.unverifiedReviews[didId] || []
    }

}

function getTime() {
    return Date.now();
}

module.exports = ChluInMemoryIndex;
