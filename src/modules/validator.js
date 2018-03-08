const cloneDeep = require('lodash.clonedeep');
const isEqual = require('lodash.isequal');
const axios = require('axios');

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
            validateSignatures: false, // TODO: enable this
            validatePoPR: false, // TODO: enable this
            expectedPoPRPublicKey: null // TODO: pass this from readReviewRecord
        }, validations);
        try {
            if (v.validateVersion) this.validateVersion(rr);
            if (v.validateSignature) this.validateSignature(rr, v.expectedPoPRPublicKey);
            if (v.validateMultihash) await this.validateMultihash(rr, rr.hash.slice(0));
            if (v.validatePoPR) await this.validatePoPR(rr.popr);
            if (v.validateSignatures){
                // await this.validateSignature(rr); // TODO: enable
                await this.validatePoPRSignaturesAndKeys(rr.popr, v.expectedPoPRPublicKey);
            }
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

    async validateSignature(obj) {
        // TODO: implementation
        throw new Error('Not implemented');
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

    async validatePoPR(popr) {
        await this.validateMultihash(popr, popr.hash.slice(0));
    }

    async validatePoPRSignaturesAndKeys(popr, expectedPoPRPublicKey = null) {
        const hash = popr.hash;
        const vmMultihash = this.keyLocationToKeyMultihash(popr.key_location);
        const isExpectedKey = expectedPoPRPublicKey === null || expectedPoPRPublicKey === vmMultihash;
        if (!isExpectedKey) {
            throw new Error('Expected PoPR to be signed by ' + expectedPoPRPublicKey + ' but found ' + vmMultihash);
        }
        const mSignature = popr.marketplace_signature;
        const vSignature = popr.vendor_signature;
        const vMultihash = this.keyLocationToKeyMultihash(popr.vendor_key_location);
        const vmSignature = popr.signature;
        const marketplaceUrl = popr.marketplace_url;
        const mMultihash = await this.fetchMarketplaceKey(marketplaceUrl);
        const v = this.chluIpfs.vendor;
        const validations = await Promise.all([
            v.verifyMultihash(vMultihash, vmMultihash, vSignature),
            v.verifyMultihash(mMultihash, vmMultihash, mSignature),
            v.verifyMultihash(vmMultihash, hash, vmSignature)
        ]);
        // Return false if any validation is false
        return validations.reduce((acc, v) => acc && v);
    }

    keyLocationToKeyMultihash(l) {
        if (l.indexOf('/ipfs/') === 0) return l.substring('/ipfs/'.length);
        return l;
    }

    async fetchMarketplaceKey(marketplaceUrl) {
        // TODO: implementation
        const response = await axios.get(marketplaceUrl + '/.well-known');
        // TODO: handle errors
        return response.data.multihash;
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