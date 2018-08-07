const IPFSUtils = require('../../../utils/ipfs');
const ChluAbstractIndex = require('./abstract');
const { getUnixTimestamp } = require('../../../utils/timing')
const { get, isEmpty } = require('lodash')

const version = 1;

class ChluInMemoryIndex extends ChluAbstractIndex {
    constructor(){
        const _index = {
            reviews: {
                list: [],
                data: {}
            },
            did: {
                data: {},
                reviewsWrittenByDid: {},
                reviewsAboutDid: {}
            }
        };
        super(_index, version);
    }

    async start() {
        this.chluIpfs.logger.debug('ChluDB InMemory Index ready')
    }

    _addReviewRecord({ multihash, reviewRecord: obj, bitcoinTransactionHash }) {
        const list = this._index.reviews.list
        const data = this._index.reviews.data
        const isUpdate = this.chluIpfs.reviewRecords.isReviewRecordUpdate(obj)
        // Step 1: Add review record info to db
        const isNew = !data[multihash]
        if (isNew) data[multihash] = {
            addedAt: getUnixTimestamp(),
            bitcoinTransactionHash: [],
            valid: isEmpty(obj.errors)
        }
        const rrData = data[multihash]
        if (bitcoinTransactionHash && rrData.bitcoinTransactionHash.indexOf(bitcoinTransactionHash) < 0) {
            rrData.bitcoinTransactionHash.push(bitcoinTransactionHash)
        }
        if (isNew) {
            // Add non-update specific info
            if (!isUpdate && isNew) {
                // TODO: don't trust the first bitcoinTransactionHash submitted but keep all of them in the index
                list.splice(0, 0, multihash);
                const subjectDidId = get(obj, 'popr.vendor_did', get(obj, 'subject.did', null)) || null // force empty string to null
                const authorDidId = get(obj, 'customer_signature.creator', null)
                if (subjectDidId) {
                    if (!this._index.did.reviewsAboutDid[subjectDidId]) {
                        this._index.did.reviewsAboutDid[subjectDidId] = [multihash]
                    } else if (this._index.did.reviewsAboutDid[subjectDidId].indexOf(multihash) < 0) {
                        this._index.did.reviewsAboutDid[subjectDidId].splice(0, 0, multihash)
                    }
                }
                if (authorDidId) {
                    if (!this._index.did.reviewsWrittenByDid[authorDidId]) {
                        this._index.did.reviewsWrittenByDid[authorDidId] = [obj.multihash]
                    } else if (this._index.did.reviewsWrittenByDid[authorDidId].indexOf(obj.multihash) < 0) {
                        this._index.did.reviewsWrittenByDid[authorDidId].splice(0, 0, obj.multihash)
                    }
                }
            }
            // Add update specific info
            if (isUpdate) {
                const previousVersion = this._getLatestReviewRecordUpdate(obj.previous_version_multihash)
                const existing = data[previousVersion] || {}
                existing.nextVersion = multihash
                const nextVersionData = data[multihash] || {};
                if (nextVersionData.addedAt) nextVersionData.addedAt = getUnixTimestamp()
                nextVersionData.multihash = multihash;
                nextVersionData.previousVersion = obj.previous_version_multihash;
                data[previousVersion] = existing;
                data[multihash] = nextVersionData;
            }
        }
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

    _putDID(publicDidDocument, didDocumentMultihash) {
        const didId = get(publicDidDocument, 'id')
        if (!this._index.did.data[didId]) {
            this._index.did.data[didId] = { multihash: didDocumentMultihash }
        } else {
            this._index.did.data[didId].multihash = didDocumentMultihash
        }
    }

    _getDID(didId) {
        return get(this._index, `did.data[${didId}]`, { multihash: null })
    }

    _getReviewsAboutDID(didId, offset, limit) {
        return slice(this._index.did.reviewsAboutDid[didId], offset, limit)
    }

    _getReviewsWrittenByDID(didId, offset, limit) {
        return slice(this._index.did.reviewsWrittenByDid[didId], offset, limit)
    }

}

function slice(array, offset, limit) {
    if (!Array.isArray(array) || array.length === 0) return []
    return array.slice(offset, (limit > 0 ? (offset + limit) : undefined))
}

module.exports = ChluInMemoryIndex;
