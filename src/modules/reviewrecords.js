const multihashes = require('multihashes');
const multihashing = require('multihashing-async');
const constants = require('../constants');
const IPFSUtils = require('./ipfs');
const { cloneDeep, defaultsDeep, findIndex, isObject, isString, isEmpty } = require('lodash');

class ReviewRecords {

    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
        const self = this;
        this.notifier = (...args) => self.notifyReviewUpdates(...args);
        this.watched = [];
        this.chluIpfs.events.on('db/replicated', this.notifier);
    }

    async watchReviewRecord(multihash, validate = true) {
        IPFSUtils.validateMultihash(multihash);
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
        IPFSUtils.validateMultihash(multihash);
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
                if (error) reviewRecord.errors = reviewRecord.errors.concat(error);
            } catch (error) {
                this.chluIpfs.events.emit('validation/error', error, m);
                throw error;
            }
        }
        if (checkForUpdates) this.watchReviewRecord(m, validate);
        const didId = reviewRecord.issuer
        reviewRecord.editable = didId === this.chluIpfs.did.didId;
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
        const dagNode = await this.chluIpfs.ipfsUtils.createDAGNode(buffer); // don't store to IPFS
        this.chluIpfs.logger.debug('Encoded (dagnode) review record: ' + IPFSUtils.getDAGNodeMultihash(dagNode));
        return dagNode;
    }

    async prepareReviewRecord(reviewRecord, bitcoinTransactionHash = null, validate = true) {
        reviewRecord = defaultsDeep(reviewRecord, {
            currency_symbol: '',
            amount: 0,
            customer_address: '',
            vendor_address: '',
            popr: null,
            chlu_version: 0,
            previous_version_multihash: '', // TODO: review this
            location: {
                lat: 0,
                lon: 0
            },
            subject: {
                did: ''
            },
            issued: 0, // TODO: timestamp
            issuer: this.chluIpfs.did.didId,
            verification: null
        })
        // TODO: review this
        const signAsIssuer = true 
        reviewRecord.verifiable = !isEmpty(reviewRecord.customer_address) && !isEmpty(reviewRecord.currency_symbol)
        if (!reviewRecord.verifiable) throw new Error('Unverified Reviews are not supported yet')
        const signAsCustomer = reviewRecord.verifiable
        reviewRecord = this.setPointerToLastReviewRecord(reviewRecord);
        // Remove hash in case it's wrong (or this is an update). It's going to be calculated by the signing function
        reviewRecord.hash = '';
        if (signAsIssuer) reviewRecord.issuer = this.chluIpfs.did.didId
        reviewRecord = await this.chluIpfs.did.signReviewRecord(reviewRecord, signAsIssuer, signAsCustomer);
        const dagNode = await this.getReviewRecordDAGNode(reviewRecord);
        reviewRecord.multihash = IPFSUtils.getDAGNodeMultihash(dagNode);
        if (validate) {
            const validationSettings = typeof validate === 'object' ? validate : {};
            await this.chluIpfs.validator.validateReviewRecord(reviewRecord, Object.assign({
                bitcoinTransactionHash
            }, validationSettings));
        }
        return { reviewRecord, dagNode };
    }

    async importUnverifiedReviews(reviews) {
        const multihashes = []
        for (const review of reviews) {
            const { multihash } = await this.storeReviewRecord(review)
            multihashes.push(multihash)
        }
    }

    async storeReviewRecord(reviewRecord, options = {}){
        const {
            previousVersionMultihash,
            publish = true,
            validate = {
                // Disable cache when storing
                useCache: false,
                forceTransactionValidation: Boolean(publish)
            },
            bitcoinTransactionHash = null
        } = options;
        const isUpdate = this.isReviewRecordUpdate(reviewRecord) || IPFSUtils.isValidMultihash(previousVersionMultihash);
        if (!bitcoinTransactionHash && publish && !isUpdate) {
            throw new Error('Payment information is required for publishing a Review Record');
        }
        let rr = Object.assign({}, reviewRecord, {
            previous_version_multihash: previousVersionMultihash || ''
        });
        this.chluIpfs.logger.debug('Preparing review record');
        const prepared = await this.prepareReviewRecord(rr, bitcoinTransactionHash, validate);
        rr = prepared.reviewRecord;
        const dagNode = prepared.dagNode;
        const multihash = IPFSUtils.getDAGNodeMultihash(dagNode);
        if (options.expectedMultihash) {
            if (options.expectedMultihash !== multihash) {
                throw new Error('Expected a different multihash');
            }
        }
        this.chluIpfs.events.emit('reviewrecord/stored', { multihash, reviewRecord: rr });
        if (publish) await this.publishReviewRecord(dagNode, previousVersionMultihash, multihash, rr, bitcoinTransactionHash);
        return multihash;
    }

    async publishReviewRecord(dagNode, previousVersionMultihash, expectedMultihash, reviewRecord, txId) {
        this.chluIpfs.logger.debug('Publishing review record to Chlu');
        // Broadcast request for pin, then wait for response
        // TODO: handle a timeout and also rebroadcast periodically, otherwise new peers won't see the message
        const multihash = await this.chluIpfs.ipfsUtils.storeDAGNode(dagNode); // store to IPFS
        if (expectedMultihash && multihash !== expectedMultihash) {
            throw new Error('Multihash mismatch when publishing');
        }
        this.chluIpfs.logger.debug('Stored review record ' + multihash + ' in IPFS');
        this.chluIpfs.logger.debug('Running Publish tasks for ' + multihash);
        await Promise.all([
            // Wait for it to be remotely pinned
            this.waitForRemotePin(multihash, txId),
            // Write to OrbitDB and wait for replication
            this.writeToOrbitDB(multihash, previousVersionMultihash, txId)
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
            bitcoinNetwork: this.chluIpfs.bitcoin.getNetwork(),
            multihash
        }, constants.eventTypes.pinned + '_' + multihash);
    }

    async writeToOrbitDB(multihash, previousVersionMultihash = null, txId = null) {
        await this.chluIpfs.orbitDb.putReviewRecordAndWaitForReplication(
            multihash,
            previousVersionMultihash,
            txId,
            this.chluIpfs.bitcoin.getNetwork()
        );
    }

    async hashObject(object, encoder) {
        const obj = cloneDeep(object);
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
        const hashed = await this.hashObject(obj, this.chluIpfs.protobuf.ReviewRecord.encode);
        hashed.issuer_signature = issuer_signature
        hashed.customer_signature = customer_signature
        return hashed
    }

    async hashPoPR(popr) {
        const obj = cloneDeep(popr)
        // TODO: fields are optional but the protons lib fails if it's not there as an empty string
        if (!obj.key_location) obj.key_location = ''
        if (!obj.vendor_did) obj.vendor_did = ''
        const sig = cloneDeep(obj.sig)
        obj.sig = null
        const hashed = await this.hashObject(obj, this.chluIpfs.protobuf.PoPR.encode);
        hashed.sig = sig
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
            && IPFSUtils.isValidMultihash(reviewRecord.previous_version_multihash))
    }

}

module.exports = ReviewRecords;