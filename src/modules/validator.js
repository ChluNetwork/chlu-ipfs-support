

class Validator {

    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
    }

    async validateReviewRecord(reviewRecord) {
        await this.validateMultihash(reviewRecord, reviewRecord.hash.slice(0));
    }

    async validateMultihash(reviewRecord, expected) {
        const hashedReviewRecord = await this.chluIpfs.reviewRecords.setReviewRecordHash(reviewRecord);
        if (expected !== hashedReviewRecord.hash) {
            throw new Error('Mismatching hash');
        }
    }

}

module.exports = Validator;