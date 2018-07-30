const multihashes = require('multihashes');
const multihashing = require('multihashing-async');
const constants = require('../constants');
const { getDAGNodeMultihash, validateMultihash, isValidMultihash } = require('./ipfs');
const { createDAGNode } = require('../utils/ipfs')
const { cloneDeep, get, findIndex, isObject, isString, isEmpty } = require('lodash');

class ReviewRecords {

    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
        const self = this;
        this.notifier = (...args) => self.notifyReviewUpdates(...args);
        this.watched = [];
        this.chluIpfs.events.on('db/replicated', this.notifier);
    }

    async watchReviewRecord(multihash, validate = true) {
        validateMultihash(multihash);
        this.watched.push({ multihash, validate });
    }

    async notifyReviewUpdates() {
        [...this.watched].forEach(async item => {
            try {
                const { multihash, validate } = item;
                const update = await this.chluIpfs.orbitDb.getLatestReviewRecordUpdate(multihash);
                if (update && update !== multihash) {
                    const reviewRecord = await this.readReviewRecord(multihash, { validate });
                    // TODO: validate update!!
                    const i = findIndex(this.watched, o => o.multihash === multihash);
                    this.watched.splice(i, 1, Object.assign(this.watched[i], {
                        multihash: update
                    }));
                    await this.notifyReviewUpdate(multihash, update, reviewRecord);
                }
            } catch (error) {
                this.chluIpfs.logger.error('Failed update check for ' + item.multihash);
                console.trace(error);
            }
        });
    }

    async getHistory(reviewRecord, history = []) {
        // TODO: maybe we should involve orbit-db here
        const prev = reviewRecord.previous_version_multihash;
        if (prev) {
            if (history.map(o => o.multihash).indexOf(prev) >= 0) {
                throw new Error('Recursive history detected');
            }
            const prevReviewRecord = await this.getReviewRecord(prev);
            history.push({
                multihash: prev,
                reviewRecord: prevReviewRecord
            });
            return await this.getHistory(prevReviewRecord, history);
        } else {
            return history;
        }
    }

    async notifyReviewUpdate(multihash, updatedMultihash, reviewRecord) {
        this.chluIpfs.events.emit('reviewrecord/updated', multihash, updatedMultihash, reviewRecord);
    }

    async getReviewRecord(multihash){
        validateMultihash(multihash);
        const buffer = await this.chluIpfs.ipfsUtils.get(multihash);
        const rr = this.chluIpfs.protobuf.ReviewRecord.decode(buffer);
        rr.multihash = multihash;
        return rr;
    }

    async readReviewRecord(multihash, options = {}) {
        const {
            checkForUpdates = false,
            getLatestVersion = false,
            validate = true,
            bitcoinTransactionHash = null
        } = options;
        let m = multihash;
        if (getLatestVersion) {
            m = await this.chluIpfs.orbitDb.getLatestReviewRecordUpdate(multihash);
        }
        const reviewRecord = await this.getReviewRecord(m);
        reviewRecord.errors = [];
        reviewRecord.multihash = m;
        if (validate) {
            const validateOptions = typeof validate === 'object' ? validate : {};
            if (!validateOptions.bitcoinTransactionHash) {
                validateOptions.bitcoinTransactionHash = bitcoinTransactionHash;
            }
            try {
                const error = await this.chluIpfs.validator.validateReviewRecord(reviewRecord, validateOptions);
                // errors array needs to stay JSON encodable
                if (error) reviewRecord.errors = reviewRecord.errors.concat({
                    message: error.message || error
                });
            } catch (error) {
                this.chluIpfs.events.emit('validation/error', error, m);
                throw error;
            }
        }
        if (checkForUpdates) this.watchReviewRecord(m, validate);
        const didId = reviewRecord.issuer
        reviewRecord.editable = didId === this.chluIpfs.did.didId && this.isVerifiable(reviewRecord);
        reviewRecord.requestedMultihash = multihash;
        reviewRecord.watching = Boolean(checkForUpdates);
        reviewRecord.gotLatestVersion = Boolean(getLatestVersion);
        this.chluIpfs.events.emit('reviewrecord/read', {
            reviewRecord,
            multihash: m,
            requestedMultihash: multihash
        });
        return reviewRecord;
    }

    async getReviewRecordDAGNode(reviewRecord) {
        this.chluIpfs.logger.debug('Encoding (protobuf) review record');
        const buffer = this.chluIpfs.protobuf.ReviewRecord.encode(reviewRecord);
        this.chluIpfs.logger.debug('Encoding (dagnode) review record');
        const dagNode = await createDAGNode(buffer); // don't store to IPFS
        this.chluIpfs.logger.debug('Encoded (dagnode) review record: ' + getDAGNodeMultihash(dagNode));
        return dagNode;
    }

    isVerifiable(reviewRecord) {
        return (
            !isEmpty(reviewRecord.customer_address)
            && !isEmpty(reviewRecord.currency_symbol)
            && !isEmpty(reviewRecord.popr)
        )
    }

    async prepareReviewRecord(reviewRecord, bitcoinTransactionHash = null, validate = true, signAsCustomer = true) {
        // TODO: review this
        const signAsIssuer = true 
        reviewRecord.verifiable = this.isVerifiable(reviewRecord)
        reviewRecord = this.setPointerToLastReviewRecord(reviewRecord);
        // Remove hash in case it's wrong (or this is an update). It's going to be calculated by the signing function
        reviewRecord.hash = '';
        if (signAsIssuer) reviewRecord.issuer = this.chluIpfs.did.didId
        reviewRecord = await this.chluIpfs.did.signReviewRecord(reviewRecord, signAsIssuer, signAsCustomer && reviewRecord.verifiable);
        const dagNode = await this.getReviewRecordDAGNode(reviewRecord);
        reviewRecord.multihash = getDAGNodeMultihash(dagNode);
        if (validate) {
            const customValidationSettings = typeof validate === 'object' ? validate : {};
            const validationSettings = Object.assign({
                bitcoinTransactionHash: reviewRecord.verifiable ? bitcoinTransactionHash : null
            }, customValidationSettings)
            await this.chluIpfs.validator.validateReviewRecord(reviewRecord, validationSettings);
        }
        return { reviewRecord, dagNode };
    }

    async importUnverifiedReviews(reviews) {
        const multihashes = []
        this.chluIpfs.logger.debug(`Importing ${reviews.length} Unverified Reviews`)
        for (const review of reviews) {
            this.chluIpfs.logger.debug('Import Unverified Review: starting')
            const multihash = await this.storeReviewRecord(review)
            this.chluIpfs.logger.debug(`Import Unverified Review: ${multihash} imported, progress ${multihashes.length}/${reviews.length}`)
            multihashes.push(multihash)
        }
        this.chluIpfs.logger.debug(`Import Unverified Review: finished importing ${reviews.length} reviews`)
        return multihashes
    }

    async storeReviewRecord(reviewRecord, options = {}){
        const {
            publish = true,
            signAsCustomer = true,
            bitcoinTransactionHash = null,
            expectedMultihash = null
        } = options;
        const validate = options.validate === false ? false : Object.assign({
            // Disable cache when storing
            useCache: false,
            forceTransactionValidation: Boolean(publish)
        }, options.validate)
        const isUpdate = this.isReviewRecordUpdate(reviewRecord)
        const previousVersionMultihash = isUpdate ? reviewRecord.previous_version_multihash : null
        const verified = reviewRecord.verifiable
        if (verified && !bitcoinTransactionHash && publish && !isUpdate) {
            throw new Error('Payment information is required for publishing a Review Record');
        }
        let rr = Object.assign({}, reviewRecord, {
            previous_version_multihash: previousVersionMultihash || ''
        });
        this.chluIpfs.logger.debug('Preparing review record');
        const prepared = await this.prepareReviewRecord(rr, verified ? bitcoinTransactionHash : null, validate, signAsCustomer);
        rr = prepared.reviewRecord;
        const dagNode = prepared.dagNode;
        const multihash = getDAGNodeMultihash(dagNode);
        if (expectedMultihash) {
            if (expectedMultihash !== multihash) {
                throw new Error('Expected a different multihash');
            }
        }
        this.chluIpfs.events.emit('reviewrecord/stored', { multihash, reviewRecord: rr });
        if (publish) await this.publishReviewRecord(dagNode, previousVersionMultihash, multihash, rr, verified ? bitcoinTransactionHash : null);
        return multihash
    }

    async publishReviewRecord(dagNode, previousVersionMultihash, expectedMultihash, reviewRecord, txId) {
        this.chluIpfs.logger.debug('Publishing review record to Chlu');
        // Make sure DID is published
        await this.chluIpfs.did.publish(null, false)
        // Broadcast request for pin, then wait for response
        const multihash = await this.chluIpfs.ipfsUtils.storeDAGNode(dagNode); // store to IPFS
        if (expectedMultihash && multihash !== expectedMultihash) {
            throw new Error('Multihash mismatch when publishing');
        }
        this.chluIpfs.logger.debug('Stored review record ' + multihash + ' in IPFS');
        this.chluIpfs.logger.debug('Running Publish tasks for ' + multihash);
        const subjectDidId = get(reviewRecord, 'popr.vendor_did', get(reviewRecord, 'subject.did', null)) || null // force empty string to null
        const authorDidId = get(reviewRecord, 'customer_signature.creator', null)
        // TODO: what if didId ends up null?
        await Promise.all([
            // Wait for it to be remotely pinned
            this.waitForRemotePin(multihash, txId),
            // Write to OrbitDB and wait for replication
            this.writeToOrbitDB(multihash, authorDidId, subjectDidId, previousVersionMultihash, txId)
        ]);
        // Operation succeeded: set this as the last review record published
        this.chluIpfs.logger.debug('Publish of ' + multihash + ' succeded: executing post-publish tasks');
        this.chluIpfs.lastReviewRecordMultihash = multihash;
        await this.chluIpfs.persistence.persistData();
        this.chluIpfs.events.emit('reviewrecord/published', multihash);
        if (previousVersionMultihash) this.notifyReviewUpdate(previousVersionMultihash, multihash, reviewRecord);
        this.chluIpfs.logger.debug('Publish of ' + multihash + ' succeded: post-publish tasks executed');
    }

    async waitForRemotePin(multihash, bitcoinTransactionHash) {
        await this.chluIpfs.room.broadcastUntil({
            type: constants.eventTypes.wroteReviewRecord,
            bitcoinTransactionHash,
            bitcoinNetwork: bitcoinTransactionHash ? this.chluIpfs.bitcoin.getNetwork() : null,
            multihash
        }, constants.eventTypes.pinned + '_' + multihash);
    }

    async writeToOrbitDB(multihash, authorDidId, subjectDidId, previousVersionMultihash = null, txId = null) {
        await this.chluIpfs.orbitDb.putReviewRecordAndWaitForReplication(
            multihash,
            authorDidId,
            subjectDidId,
            previousVersionMultihash,
            txId,
            txId ? this.chluIpfs.bitcoin.getNetwork() : null
        );
    }

    async hashObject(object, encoder, decoder) {
        let obj = cloneDeep(object);
        let name;
        try {
            // Try to detect existing multihash type
            const multihash = multihashes.fromB58String(obj.hash);
            const decoded = multihashes.decode(multihash);
            name = decoded.name;
        } catch (error) {
            // Use default
            name = 'sha2-256';
        }
        obj.hash = '';
        obj = decoder(encoder(obj)) // This fixes missing fields and other weirdness. TODO: this is dirty fix
        this.chluIpfs.logger.debug('Preparing to hash the object: ' + JSON.stringify(obj));
        const toHash = encoder(obj); 
        const multihash = await new Promise((resolve, reject) => {
            multihashing(toHash, name, (err, multihash) => {
                if (err) reject(err); else resolve(multihash);
            });
        });
        const hash = multihashes.toB58String(multihash);
        /*
        if (decoder) {
            // TODO: this is test code
            const target = cloneDeep(obj)
            delete target.multihash
            const decoded = decoder(toHash)
            decoded.hash = ''
            const expect = require('chai').expect
            expect(decoded).to.deep.equal(target)
            if (obj.hash) expect(hash).to.equal(obj.hash)
        }
        */
        obj.hash = hash
        this.chluIpfs.logger.debug('Hashed to ' + obj.hash + ' the object ' + JSON.stringify(obj));
        return obj;
    }

    async hashReviewRecord(reviewRecord) {
        const obj = cloneDeep(reviewRecord)
        // TODO: better checks
        const issuer_signature = cloneDeep(obj.issuer_signature)
        const customer_signature = cloneDeep(obj.customer_signature)
        obj.issuer_signature = null
        obj.customer_signature = null
        if (!obj.key_location) obj.key_location = ''
        if (!obj.previous_version_multihash) obj.previous_version_multihash = ''
        if (!obj.last_reviewrecord_multihash) obj.last_reviewrecord_multihash = ''
        const hashed = await this.hashObject(obj, this.chluIpfs.protobuf.ReviewRecord.encode, this.chluIpfs.protobuf.ReviewRecord.decode);
        hashed.issuer_signature = issuer_signature
        hashed.customer_signature = customer_signature
        return hashed
    }

    async hashPoPR(popr) {
        const obj = cloneDeep(popr)
        // TODO: fields are optional but the protons lib fails if it's not there as an empty string
        if (!obj.key_location) obj.key_location = ''
        if (!obj.vendor_did) obj.vendor_did = ''
        const signature = cloneDeep(obj.signature)
        obj.signature = null
        const hashed = await this.hashObject(obj, this.chluIpfs.protobuf.PoPR.encode, this.chluIpfs.protobuf.PoPR.decode);
        hashed.signature = signature
        return hashed
    }

    setPointerToLastReviewRecord(reviewRecord) {
        reviewRecord.last_reviewrecord_multihash = this.chluIpfs.lastReviewRecordMultihash || '';
        return reviewRecord;
    }

    isReviewRecordUpdate(reviewRecord) {
        return (isObject(reviewRecord)
            && isString(reviewRecord.previous_version_multihash)
            && !isEmpty(reviewRecord.previous_version_multihash)
            && isValidMultihash(reviewRecord.previous_version_multihash))
    }

}

module.exports = ReviewRecords;