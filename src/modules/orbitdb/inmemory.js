const IPFSUtils = require('../../utils/ipfs');
const ChluAbstractIndex = require('./abstract');

const version = 0;

class ChluInMemoryIndex extends ChluAbstractIndex {
    constructor(){
        const _index = {
            list: [],
            data: {}
        };
        super(_index, version);
    }

    _addOriginalReviewRecord(obj) {
        if (this._index.list.indexOf(obj.multihash) < 0) {
            this._index.list.splice(0, 0, obj.multihash);
            this._index.data[obj.multihash] = {
                multihash: obj.multihash,
                addedAt: getTime(),
                bitcoinTransactionHash: obj.bitcoinTransactionHash || null
            };
        }
    }

    _addReviewRecordUpdate(obj) {
        const data = this._index.data[obj.fromMultihash];
        data.nextVersion = obj.toMultihash;
        const nextVersionData = {
            addedAt: getTime()
        };
        nextVersionData.multihash = obj.toMultihash;
        nextVersionData.previousVersion = obj.fromMultihash;
        this._index.data[obj.fromMultihash] = data;
        this._index.data[obj.toMultihash] = nextVersionData;
    }

    _getLatestReviewRecordUpdate(multihash) {
        return this.followPointerAcyclic(multihash, this._index.data, 'nextVersion', undefined, IPFSUtils.isValidMultihash);
    }

    _getOriginalReviewRecord(multihash) {
        return this.followPointerAcyclic(multihash, this._index.data, 'previousVersion', undefined, IPFSUtils.isValidMultihash);
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
        return this._index.data[multihash] || null;
    }

    _getReviewRecordList(offset, limit) {
        return this._index.list.slice(offset, (limit > 0 ? (offset + limit) : undefined));
    }

    _getReviewRecordCount() {
        return this._index.list.length;
    }

}

function getTime() {
    return Date.now();
}

module.exports = ChluInMemoryIndex;
