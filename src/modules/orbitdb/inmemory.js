const IPFSUtils = require('../../utils/ipfs');
const ChluAbstractIndex = require('./abstract');

const version = 0;

class ChluInMemoryIndex extends ChluAbstractIndex {
    constructor(){
        const _index = {
            reviewRecords: [],
            updates: {}
        };
        super(_index, version);
    }

    _addOriginalReviewRecord(obj) {
        if (this._index.reviewRecords.indexOf(obj.multihash) < 0) {
            this._index.reviewRecords.splice(0, 0, obj.multihash);
        }
    }

    _addReviewRecordUpdate(obj) {
        this._index.updates[obj.fromMultihash] = obj.toMultihash;
    }

    _getLatestReviewRecordUpdate(multihash, stack = [multihash]) {
        let next;
        next = this._index.updates[multihash];
        if (IPFSUtils.isValidMultihash(next) && stack.indexOf(next) === -1) {
            // One next iteration
            return this.getLatestReviewRecordUpdate(next, stack.concat(next));
        } else {
            // End of search, return latest valid data
            return stack[stack.length-1];
        }
    }

    _getReviewRecordList() {
        // Clone array
        return [ ...this._index.reviewRecords ];
    }

}

module.exports = ChluInMemoryIndex;
