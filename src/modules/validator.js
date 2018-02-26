const cloneDeep = require('lodash.clonedeep');
const isEqual = require('lodash.isequal');

class Validator {

    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
    }

    async validateReviewRecord(reviewRecord, validations = {}) {
        const rr = cloneDeep(reviewRecord);
        const v = Object.assign({
            throwErrors: true,
            validateVersion: true,
            validateMultihash: true,
            validateHistory: true,
            validateSignature: false, // TODO: enable this
            expectedPoPRPublicKey: null // TODO: pass this from readReviewRecord
        }, validations);
        try {
            if (v.validateVersion) this.validateVersion(rr);
            if (v.validateSignature) this.validateSignature(rr, v.expectedPoPRPublicKey);
            if (v.validateMultihash) await this.validateMultihash(rr, rr.hash.slice(0));
            if (v.validateHistory) await this.validateHistory(rr);
        } catch (error) {
            if (v.throwErrors) {
                throw error;
            } else {
                return error;
            }
        }
        return null;
    }

    async validateMultihash(obj, expected) {
        const hashedObj = await this.chluIpfs.reviewRecords.hashReviewRecord(obj);
        if (expected !== hashedObj.hash) {
            throw new Error('Mismatching hash');
        }
    }

    async validateHistory(reviewRecord) {
        const history = await this.chluIpfs.reviewRecords.getHistory(reviewRecord);
        if (history.length > 0) {
            const reviewRecords = [{ reviewRecord }].concat(history);
            const validations = reviewRecords.map(async (item, i) => {
                await this.validateReviewRecord(item.reviewRecord, { validateHistory: false });
                if (i !== reviewRecords.length-1) {
                    this.validatePrevious(item.reviewRecord, reviewRecords[i+1].reviewRecord);
                }
            });
            await Promise.all(validations);
        }
    }

    async validateSignature(reviewRecord, expectedPoPRPublicKey = null) {
        return true; // TODO: implementation
    }

    validatePrevious(reviewRecord, previousVersion) {
        // Check that the PoPR was not changed
        const poprEqual = isEqual(reviewRecord.popr, previousVersion.popr);
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

function assertFieldsEqual(a, b, fields) {
    for (const field of fields) {
        if (!isEqual(a[field], b[field])) throw new Error(field + ' has changed');
    }
}

module.exports = Validator;