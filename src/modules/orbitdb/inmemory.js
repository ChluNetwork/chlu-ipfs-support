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

    _getLatestReviewRecordUpdate(multihash, stack = [multihash]) {
        let data;
        data = this._index.data[multihash];
        if (IPFSUtils.isValidMultihash(data.nextVersion) && stack.indexOf(data.nextVersion) === -1) {
            // One next iteration
            return this.getLatestReviewRecordUpdate(data.nextVersion, stack.concat(data.nextVersion));
        } else {
            // End of search, return latest valid data
            return stack[stack.length-1];
        }
    }

    _getReviewRecordList() {
        // Clone array
        return [ ...this._index.list ];
    }

}

function getTime() {
    return Date.now();
}

module.exports = ChluInMemoryIndex;
