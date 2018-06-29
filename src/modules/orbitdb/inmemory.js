const IPFSUtils = require('../../utils/ipfs');
const ChluAbstractIndex = require('./abstract');
const { get } = require('lodash')

const version = 0;

class ChluInMemoryIndex extends ChluAbstractIndex {
    constructor(){
        const _index = {
            reviews: {
                list: [],
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
        const list = this._index.reviews.list
        const data = this._index.reviews.data
        if (list.indexOf(obj.multihash) < 0) {
            list.splice(0, 0, obj.multihash);
            data[obj.multihash] = {
                multihash: obj.multihash,
                addedAt: getTime(),
                bitcoinTransactionHash: obj.bitcoinTransactionHash || null
            };
            if (obj.didId) {
                if (!this._index.did.reviewsByDid[obj.didId]) {
                    this._index.did.reviewsByDid[obj.didId] = [obj.multihash]
                } else {
                    this._index.did.reviewsByDid[obj.didId].push(obj.multihash)
                }
            }
        }
    }

    _addReviewRecordUpdate(obj) {
        const data = this._index.reviews.data
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
        return this.followPointerAcyclic(multihash, this._index.reviews.data, 'nextVersion', undefined, IPFSUtils.isValidMultihash);
    }

    _getOriginalReviewRecord(multihash) {
        return this.followPointerAcyclic(multihash, this._index.reviews.data, 'previousVersion', undefined, IPFSUtils.isValidMultihash);
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
        return this._index.reviews.data[multihash] || null;
    }

    _getReviewRecordList(offset, limit) {
        return slice(this._index.reviews.list, offset, limit);
    }

    _getReviewRecordCount() {
        return this._index.reviews.list.length;
    }

    _putDID(didId, didDocumentMultihash) {
        if (!this._index.did.data[didId]) {
            this._index.did.data[didId] = { multihash: didDocumentMultihash }
        } else {
            this._index.did.data[didId].multihash = didDocumentMultihash
        }
    }

    _getDID(didId) {
        return get(this._index.did.data[didId], 'multihash', null)
    }

    _getReviewsByDID(didId, offset, limit) {
        return slice(this._index.did.reviewsByDid[didId], offset, limit)
    }

}

function getTime() {
    return Date.now();
}

function slice(array, offset, limit) {
    if (!Array.isArray(array) || array.length === 0) return []
    return array.slice(offset, (limit > 0 ? (offset + limit) : undefined))
}

module.exports = ChluInMemoryIndex;
