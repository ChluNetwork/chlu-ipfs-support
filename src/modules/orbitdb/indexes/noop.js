const ChluAbstractIndex = require('./abstract');
const version = 1

class ChluNOOPIndex extends ChluAbstractIndex {

    constructor() {
        super(version)
    }

    async updateIndex(){
        // Do nothing
    }

    async start() {
        await super.start()
        this.chluIpfs.logger.warn('ChluDB NOOP Index started. This Index will silently do nothing!')
    }

    _addReviewRecord() {
        // Do nothing
    }

    _getLatestReviewRecordUpdate(multihash) {
        return multihash
    }

    _getOriginalReviewRecord(multihash) {
        return multihash
    }

    _getReviewRecordMetadata() {
        return null
    }

    _getReviewRecordList() {
        return []
    }

    _getReviewRecordCount() {
        return 0
    }

    _putDID() {
        // Do nothing
    }

    _getDID() {
        return { multihash: null }
    }

    _getReviewsAboutDID() {
        return []
    }

    _getReviewsWrittenByDID() {
        return []
    }
}

module.exports = ChluNOOPIndex