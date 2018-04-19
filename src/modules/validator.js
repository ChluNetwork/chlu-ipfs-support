const { cloneDeep, isEqual } = require('lodash');
const IPFSUtils = require('../utils/ipfs');

class Validator {

    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
        this.defaultValidationSettings = {
            useCache: true,
            throwErrors: true,
            validateVersion: true,
            validateMultihash: true,
            validateHistory: true,
            validateSignatures: true,
            expectedRRPublicKey: null,
            expectedPoPRPublicKey: null // TODO: pass this from readReviewRecord
        };
    }

    async validateReviewRecord(reviewRecord, validations = {}) {
        this.chluIpfs.logger.debug('Validating review record');
        const rr = cloneDeep(reviewRecord);
        const v = Object.assign(this.getDefaultValidationSettings(), validations);
        try {
            if (v.validateVersion) this.validateVersion(rr);
            if (!rr.multihash || !v.useCache || !this.chluIpfs.cache.isValidityCached(rr.multihash)) {
                if (v.validateMultihash) await this.validateMultihash(rr, rr.hash.slice(0));
                if (v.validateSignatures){
                    await Promise.all([
                        this.validateRRSignature(rr, v.expectedRRPublicKey),
                        this.validatePoPRSignaturesAndKeys(rr.popr, v.expectedPoPRPublicKey, v.useCache)
                    ]);
                }
                if (v.validateHistory) await this.validateHistory(rr, v);
                if (v.bitcoinTransactionHash)  await this.validateBitcoinTransaction(rr, v.bitcoinTransactionHash, v.useCache);
                if (rr.multihash && v.useCache) this.chluIpfs.cache.cacheValidity(rr.multihash);
            }
            this.chluIpfs.logger.debug('Validated review record (was valid)');
        } catch (error) {
            this.chluIpfs.logger.debug('Validated review record (was NOT valid)');
            if (v.throwErrors) {
                throw error;
            } else {
                return error;
            }
        }
        return null;
    }

    async validateMultihash(obj, expected) {
        this.chluIpfs.logger.debug('Validating multihash');
        const hashedObj = await this.chluIpfs.reviewRecords.hashReviewRecord(obj);
        if (expected !== hashedObj.hash) {
            throw new Error('Mismatching hash: got ' + hashedObj.hash + ' instead of ' + expected);
        }
    }

    async validateRRSignature(rr, expectedRRPublicKey = null) {
        this.chluIpfs.logger.debug('Validating RR signature');
        const pubKeyMultihash = this.keyLocationToKeyMultihash(rr.key_location);
        const isExpectedKey = expectedRRPublicKey === null || expectedRRPublicKey === pubKeyMultihash;
        if (!isExpectedKey) {
            throw new Error('Expected Review Record to be signed by ' + expectedRRPublicKey + ' but found ' + pubKeyMultihash);
        }
        const valid = await this.chluIpfs.crypto.verifyMultihash(pubKeyMultihash, rr.hash, rr.signature);
        if (valid) {
            this.chluIpfs.events.emit('customer pubkey', pubKeyMultihash);
        } else {
            throw new Error('The ReviewRecord signature is invalid');
        }
        return valid;
    }

    async validateHistory(reviewRecord, validations = {}) {
        this.chluIpfs.logger.debug('Validating History');
        const v = Object.assign({}, this.defaultValidationSettings, validations, {
            validateHistory: false
        });
        const history = await this.chluIpfs.reviewRecords.getHistory(reviewRecord);
        if (history.length > 0) {
            const reviewRecords = [{ reviewRecord }].concat(history);
            const validations = reviewRecords.map(async (item, i) => {
                await this.validateReviewRecord(item.reviewRecord, v);
                if (i !== reviewRecords.length-1) {
                    this.validatePrevious(item.reviewRecord, reviewRecords[i+1].reviewRecord);
                }
            });
            await Promise.all(validations);
        }
    }

    async validatePoPRSignaturesAndKeys(popr, expectedPoPRPublicKey = null, useCache = true) {
        this.chluIpfs.logger.debug('Validating PoPR Signatures and keys');
        if (!popr.hash) {
            popr = await this.chluIpfs.reviewRecords.hashPoPR(popr);
        }
        const hash = popr.hash;
        if (!useCache || !this.chluIpfs.cache.isValidityCached(hash)) {
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
            const mMultihash = await this.fetchMarketplaceKey(marketplaceUrl, useCache);
            const c = this.chluIpfs.crypto;
            const validations = await Promise.all([
                c.verifyMultihash(vMultihash, vmMultihash, vSignature),
                c.verifyMultihash(mMultihash, vmMultihash, mSignature),
                c.verifyMultihash(vmMultihash, hash, vmSignature)
            ]);
            // false if any validation is false
            const valid = validations.reduce((acc, v) => acc && v);
            if (valid) {
                if (useCache) this.chluIpfs.cache.cacheValidity(hash);
                // Emit events about keys discovered
                this.chluIpfs.events.emit('vendor pubkey', vMultihash);
                this.chluIpfs.events.emit('vendor-marketplace pubkey', vmMultihash);
                this.chluIpfs.events.emit('marketplace pubkey', mMultihash);
            } else {
                throw new Error('The PoPR is not correctly signed');
            }
            return valid;
        } else {
            return true;
        }
    }

    async validateBitcoinTransaction(rr, txId, useCache = true) {
        let txInfo;
        if (useCache) txInfo = this.chluIpfs.cache.getBitcoinTransactionInfo(txId);
        if (!txInfo) {
            txInfo = await this.chluIpfs.bitcoin.getTransactionInfo(txId);
            if (useCache) this.chluIpfs.cache.cacheBitcoinTxInfo(txId, txInfo);
        }
        // Check validity
        // TODO: check confirmations?
        if (!txInfo.isChlu) {
            throw new Error(txId + ' is not a Chlu transaction');
        }
        if (rr.multihash !== txInfo.multihash) {
            throw new Error('Mismatching transaction multihash');
        }
        if (rr.amount !== txInfo.spentSatoshi) {
            throw new Error('Review Record amount is not matching transaction amount');
        }
        if (txInfo.outputs.length !== 1) {
            throw new Error('Transactions that send bitcoin to multiple addresses are not supported yet');
        }
        const toAddress = txInfo.outputs[0].toAddress;
        if (toAddress !== rr.vendor_address) {
            throw new Error('The Vendor address in the Review Record is different than the address the funds were sent to');
        }
        if (txInfo.fromAddress !== rr.customer_address) {
            throw new Error('The Customer address in the Review Record is different than the address the funds were sent from');
        }
    }

    keyLocationToKeyMultihash(l) {
        if (l.indexOf('/ipfs/') === 0) return l.substring('/ipfs/'.length);
        return l;
    }

    async fetchMarketplaceKey(marketplaceUrl, useCache = true) {
        try {
            this.chluIpfs.logger.debug('Fetching marketplace key for ' + marketplaceUrl);
            if (useCache) {
                const multihash = this.chluIpfs.cache.getMarketplacePubKeyMultihash(marketplaceUrl);
                if (multihash) return multihash;
            }
            const response = await this.chluIpfs.http.get(marketplaceUrl + '/.well-known');
            const multihash = response.data.multihash;
            IPFSUtils.validateMultihash(multihash);
            if (useCache) this.chluIpfs.cache.cacheMarketplacePubKeyMultihash(marketplaceUrl, multihash);
            this.chluIpfs.logger.debug('Fetched marketplace key for ' + marketplaceUrl + ': located at ' + multihash);
            return multihash;
        } catch (error) {
            throw new Error('Error while fetching the Marketplace key at ' + marketplaceUrl + ': ' + error.message || error);
        }
    }

    validatePrevious(reviewRecord, previousVersion) {
        // Check that the PoPR was not changed
        const poprEqual = isEqual(reviewRecord.popr, previousVersion.popr);
        if (!poprEqual) {
            throw new Error('PoPR was changed');
        }
        // Check other fields
        assertFieldsEqual(previousVersion, reviewRecord, [
            'amount',
            'currency_symbol',
            'customer_address',
            'vendor_address',
            'key_location'
        ]);
    }

    validateVersion(reviewRecord) {
        if (reviewRecord.chlu_version !== 0) {
            throw new Error('Chlu Protocol Version unsupported');
        }
    }

    getDefaultValidationSettings() {
        return cloneDeep(this.defaultValidationSettings);
    }

}

function assertFieldsEqual(a, b, fields) {
    for (const field of fields) {
        if (!isEqual(a[field], b[field])) throw new Error(field + ' has changed from ' + a[field] + ' to ' + b[field]);
    }
}

module.exports = Validator;