const IPFSUtils = require('../../utils/ipfs');

const version = 0;

class ChluIndex {
    constructor(){
        this._index = {
            reviewRecords: [],
            updates: {}
        };
    }

    /**
     * Called by OrbitDB to update the index 
     */
    updateIndex(oplog) {
        oplog.values
            .slice()
            .forEach(item => {
                // Skip operations from a different chlu store version
                if (item.payload.version === version) {
                    // TODO: check update validity, RR validity if possible
                    if (item.payload.op === operations.ADD_REVIEW_RECORD && IPFSUtils.isValidMultihash(item.payload.multihash)) {
                        // Do not create duplicates
                        if (this._index.reviewRecords.indexOf(item.payload.multihash) < 0) {
                            this._index.reviewRecords.splice(0, 0, item.payload.multihash);
                        }
                    } else if (item.payload.op === operations.UPDATE_REVIEW_RECORD && IPFSUtils.isValidMultihash(item.payload.multihash) && IPFSUtils.isValidMultihash(item.payload.previousVersionMultihash)) {
                        // TODO: check that whatever is being updated is in the DB
                        // the multihash to be updated might already be an update. Be careful!
                        const from = this.getLatestReviewRecordUpdate(item.payload.previousVersionMultihash);
                        this._index.updates[from] = item.payload.multihash;
                    }
                }
            });
    }

    getLatestReviewRecordUpdate(multihash, stack = [multihash]) {
        IPFSUtils.validateMultihash(multihash);
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

    getReviewRecordList() {
        // Clone array
        return [ ...this._index.reviewRecords ];
    }

}

const operations = {
    ADD_REVIEW_RECORD: 'ADD_REVIEW_RECORD',
    UPDATE_REVIEW_RECORD: 'UPDATE_REVIEW_RECORD'
};

module.exports = Object.assign(ChluIndex, { operations, version });
