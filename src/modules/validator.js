const { cloneDeep, isEqual } = require('lodash');

class Validator {

    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
        this.defaultVerifiedReviewValidationSettings = {
            useCache: true,
            throwErrors: true,
            validateVersion: true,
            validateMultihash: true,
            validateHistory: true,
            validateSignatures: true,
            bitcoinTransactionHash: null,
            forceTransactionValidation: true
        };
        this.defaultUnverifiedReviewValidationSettings = {
            useCache: true,
            throwErrors: true,
            validateVersion: true,
            validateMultihash: true,
            validateHistory: true,
            validateSignatures: true,
            bitcoinTransactionHash: null,
            forceTransactionValidation: false
        };
    }

    async validateReviewRecord(reviewRecord, validations = {}) {
        this.chluIpfs.logger.debug('Validating review record');
        const rr = cloneDeep(reviewRecord);
        const v = Object.assign(this.getDefaultValidationSettings(rr.verifiable), validations);
        try {
            if (v.validateVersion) this.validateVersion(rr);
            if (!rr.multihash || !v.useCache || !this.chluIpfs.cache.isValidityCached(rr.multihash)) {
                if (v.validateMultihash) await this.validateMultihash(rr, rr.hash.slice(0));
                if (v.validateSignatures) {
                    let signatureValidations = [
                        this.validateRRIssuerSignature(rr)
                    ]
                    if (rr.verifiable) {
                        signatureValidations = [
                            ...signatureValidations,
                            this.validateRRCustomerSignature(rr),
                            this.validatePoPRSignaturesAndKeys(rr.popr, v.useCache)
                        ]
                    }
                    await Promise.all(signatureValidations);
                }
                if (v.validateHistory) await this.validateHistory(rr, v);
                const isUpdate = this.chluIpfs.reviewRecords.isReviewRecordUpdate(rr);
                if (rr.verifiable && !isUpdate && (v.forceTransactionValidation || v.bitcoinTransactionHash)) {
                    await this.validateBitcoinTransaction(rr, v.bitcoinTransactionHash, v.useCache);
                }
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

    async validateRRCustomerSignature(rr) {
        this.chluIpfs.logger.debug('Validating RR Customer signatures');
        const didId = rr.customer_signature.creator // TODO: should there be a customer_did field? author.did?
        const valid = await this.chluIpfs.did.verifyMultihash(didId, rr.hash, rr.customer_signature);
        if (valid) {
            this.chluIpfs.events.emit('discover/did/customer', didId);
        } else {
            throw new Error('The ReviewRecord Customer signature is invalid');
        }
        return valid;
    }

    async validateRRIssuerSignature(rr) {
        this.chluIpfs.logger.debug('Validating RR Issuer signature');
        const didId = rr.issuer
        const valid = await this.chluIpfs.did.verifyMultihash(didId, rr.hash, rr.issuer_signature);
        if (valid) {
            this.chluIpfs.events.emit('discover/did/issuer', didId);
        } else {
            throw new Error('The ReviewRecord Issuer signature is invalid');
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
        } else if (this.chluIpfs.reviewRecords.isReviewRecordUpdate(reviewRecord)) {
            throw new Error('Review Record is an update but has no previous version');
        }
    }

    async validatePoPRSignaturesAndKeys(popr, useCache = true) {
        this.chluIpfs.logger.debug('Validating PoPR Signatures and keys');
        if (!popr.hash) {
            popr = await this.chluIpfs.reviewRecords.hashPoPR(popr);
        }
        const hash = popr.hash;
        if (!useCache || !this.chluIpfs.cache.isValidityCached(hash)) {
            const vmMultihash = this.keyLocationToKeyMultihash(popr.key_location);
            const mSignature = popr.marketplace_signature;
            const vSignature = popr.vendor_signature;
            const vendorDIDID = popr.vendor_did
            const vmSignature = popr.signature;
            const marketplaceUrl = popr.marketplace_url;
            const marketplaceDIDID = await this.fetchMarketplaceDIDID(marketplaceUrl, useCache);
            const DID = this.chluIpfs.did;
            const crypto = this.chluIpfs.crypto
            const validations = await Promise.all([
                DID.verifyMultihash(vendorDIDID, vmMultihash, vSignature),
                DID.verifyMultihash(marketplaceDIDID, vmMultihash, mSignature),
                crypto.verifyMultihash(vmMultihash, hash, vmSignature)
            ]);
            // false if any validation is false
            const valid = validations.reduce((acc, v) => acc && v);
            if (valid) {
                if (useCache) this.chluIpfs.cache.cacheValidity(hash);
                // Emit events about keys discovered
                this.chluIpfs.events.emit('discover/did/vendor', vendorDIDID);
                this.chluIpfs.events.emit('discover/keys/vendor-marketplace', vmMultihash);
                this.chluIpfs.events.emit('discover/did/marketplace', marketplaceDIDID);
            } else {
                throw new Error('The PoPR is not correctly signed');
            }
            return valid;
        } else {
            return true;
        }
    }

    async validateBitcoinTransaction(rr, transactionHash = null, useCache = true) {
        this.chluIpfs.logger.debug('Validating Bitcoin TX ' + (transactionHash || '(unknown)') + ' for ' + rr.multihash);
        if (!rr.multihash) {
            throw new Error('Validator needs RR multihash to validate Transaction');
        }
        if (!transactionHash) {
            // retrieve it from DB
            this.chluIpfs.logger.debug('Searching OrbitDB for TX for ' + rr.multihash);
            const metadata = await this.chluIpfs.orbitDb.getReviewRecordMetadata(rr.multihash);
            transactionHash = metadata ? metadata.bitcoinTransactionHash : null;
        }
        if (transactionHash) {
            this.chluIpfs.logger.debug('Found TX ' + transactionHash + ' for ' + rr.multihash);
        } else {
            throw new Error('Transaction Hash for Review Record ' + rr.multihash + ' not found');
        }
        let txInfo;
        if (useCache) txInfo = this.chluIpfs.cache.getBitcoinTransactionInfo(transactionHash);
        if (!txInfo) {
            txInfo = await this.chluIpfs.bitcoin.getTransactionInfo(transactionHash);
            if (useCache) this.chluIpfs.cache.cacheBitcoinTxInfo(txInfo);
        }
        // Check validity
        // TODO: check confirmations?
        if (!txInfo.isChlu) {
            throw new Error(transactionHash + ' is not a Chlu transaction');
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

    async fetchMarketplaceDIDID(marketplaceUrl, useCache = true) {
        try {
            this.chluIpfs.logger.debug('Fetching marketplace DID for ' + marketplaceUrl);
            if (useCache) {
                const didId = this.chluIpfs.cache.getMarketplaceDIDID(marketplaceUrl);
                if (didId) return didId;
            }
            const response = await this.chluIpfs.http.get(marketplaceUrl + '/.well-known');
            const didId = response.data.didId;
            // TODO: validate didId
            if (useCache) this.chluIpfs.cache.cacheMarketplaceDIDID(marketplaceUrl, didId);
            this.chluIpfs.logger.debug('Fetched marketplace DID for ' + marketplaceUrl + ': ID ' + didId);
            return didId;
        } catch (error) {
            throw new Error('Error while fetching the Marketplace DID at ' + marketplaceUrl + ': ' + error.message || error);
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
            'issuer'
        ]);
    }

    validateVersion(reviewRecord) {
        if (reviewRecord.chlu_version !== 0) {
            throw new Error('Chlu Protocol Version unsupported');
        }
    }

    getDefaultValidationSettings(verifiable) {
        if (verifiable) {
            return cloneDeep(this.defaultVerifiedReviewValidationSettings)
        } else {
            return cloneDeep(this.defaultUnverifiedReviewValidationSettings)
        }
    }

}

function assertFieldsEqual(a, b, fields) {
    for (const field of fields) {
        if (!isEqual(a[field], b[field])) throw new Error(field + ' has changed from ' + a[field] + ' to ' + b[field]);
    }
}

module.exports = Validator;