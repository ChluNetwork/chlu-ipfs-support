

class Validator {

    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
    }

    async validateReviewRecord(reviewRecord) {
        await this.validateMultihash(reviewRecord, reviewRecord.hash.slice(0));
        await this.validateHistory(reviewRecord);
    }

    async validateMultihash(reviewRecord, expected) {
        const hashedReviewRecord = await this.chluIpfs.reviewRecords.setReviewRecordHash(reviewRecord);
        if (expected !== hashedReviewRecord.hash) {
            throw new Error('Mismatching hash');
        }
    }

    async validateHistory(reviewRecord) {
        const history = await this.chluIpfs.reviewRecords.getHistory(reviewRecord);
        const validations = history.map(async multihash => {
            const rr = await this.chluIpfs.reviewRecords.readReviewRecord(multihash);
            await this.validateReviewRecord(rr);
        });
        await Promise.all(validations);
    }

}

module.exports = Validator;