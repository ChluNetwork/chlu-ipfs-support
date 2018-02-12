class Validator {

    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
    }

    async validateReviewRecord(reviewRecord, validations = {}) {
        const rr = cloneReviewRecord(reviewRecord);
        const v = Object.assign({
            validateVersion: true,
            validateMultihash: true,
            validateHistory: true
        }, validations);
        if (v.validateVersion) this.validateVersion(rr);
        if (v.validateMultihash) await this.validateMultihash(rr, rr.hash.slice(0));
        if (v.validateHistory) await this.validateHistory(rr);
    }

    async validateMultihash(reviewRecord, expected) {
        const hashedReviewRecord = await this.chluIpfs.reviewRecords.setReviewRecordHash(reviewRecord);
        if (expected !== hashedReviewRecord.hash) {
            throw new Error('Mismatching hash');
        }
    }

    async validateHistory(reviewRecord) {
        const history = await this.chluIpfs.reviewRecords.getHistory(reviewRecord);
        if (history.length > 0) {
            const opt = {
                validate: false
            };
            const rr = await this.chluIpfs.reviewRecords.readReviewRecord(history[0], opt);
            this.validatePrevious(reviewRecord, rr);
        }
        const validations = history.map(async (multihash, i) => {
            const opt = {
                validate: false
            };
            const rr = await this.chluIpfs.reviewRecords.readReviewRecord(multihash, opt);
            await this.validateReviewRecord(rr, { validateHistory: false });
            if (i !== history.length-1) {
                const prev = await this.chluIpfs.reviewRecords.readReviewRecord(history[i+1]);
                this.validatePrevious(rr, prev);
            }
        });
        await Promise.all(validations);
    }

    validatePrevious(reviewRecord, previousVersion) {
        // Check that the PoPR was not changed
        const poprEqual = deepEqual(reviewRecord.popr, previousVersion.popr);
        if (!poprEqual) {
            throw new Error('PoPR was changed');
        }
        // Check other fields
        assertFieldsEqual(reviewRecord, previousVersion, [
            'amount',
            'currency_symbol',
            'customer_address',
            'vendor_address'
        ]);
    }

    validateVersion(reviewRecord) {
        if (reviewRecord.chlu_version !== 0) {
            throw new Error('Chlu Protocol Version unsupported');
        }
    }

}

function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

function assertFieldsEqual(a, b, fields) {
    for (const field of fields) {
        let equal;
        if (typeof a[field] === 'object' || typeof b[field] === 'object') {
            equal = deepEqual(a, b);
        } else {
            equal = a[field] === b[field];
        }
        if (!equal) throw new Error(field + ' has changed');
    }
}

function cloneReviewRecord(reviewRecord) {
    const rr = Object.assign({}, reviewRecord);
    if (typeof rr.popr === 'object') {
        Object.assign(rr.popr, reviewRecord.popr);
    }
    return rr;
}

module.exports = Validator;