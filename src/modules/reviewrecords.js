const protons = require('protons');
const multihashes = require('multihashes');
const multihashing = require('multihashing-async');
const constants = require('../constants');
const protobuf = protons(require('../utils/protobuf'));
const IPFSUtils = require('./ipfs');
const { cloneDeep, findIndex } = require('lodash');

class ReviewRecords {

    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
        const self = this;
        this.notifier = (...args) => self.notifyReviewUpdates(...args);
        this.watched = [];
        this.chluIpfs.events.on('replicated', this.notifier);
    }

    async watchReviewRecord(multihash, validate = true) {
        this.watched.push({ multihash, validate });
    }

    async notifyReviewUpdates() {
        [...this.watched].forEach(async item => {
            try {
                const { multihash, validate } = item;
                const update = await this.chluIpfs.orbitDb.get(multihash);
                if (update && update !== multihash) {
                    const reviewRecord = await this.readReviewRecord(multihash, { validate });
                    // TODO: validate update!!
                    const i = findIndex(this.watched, o => o.multihash === multihash);
                    this.watched.splice(i, 1, [update]);
                    await this.notifyReviewUpdate(multihash, update, reviewRecord);
                }
            } catch (error) {
                this.chluIpfs.logger.error('Failed update check for ' + item.multihash);
                console.trace(error);
            }
        });
    }

    async getHistory(reviewRecord, history = []) {
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
        this.chluIpfs.events.emit('updated ReviewRecord', multihash, updatedMultihash, reviewRecord);
    }

    async getReviewRecord(multihash){
        IPFSUtils.validateMultihash(multihash);
        const buffer = await this.chluIpfs.ipfsUtils.get(multihash);
        const rr = protobuf.ReviewRecord.decode(buffer);
        rr.multihash = multihash;
        return rr;
    }

    async readReviewRecord(multihash, options = {}) {
        const {
            checkForUpdates = false,
            getLatestVersion = false,
            validate = true
        } = options;
        let m = multihash;
        if (getLatestVersion) {
            m = await this.chluIpfs.orbitDb.get(multihash);
        }
        const reviewRecord = await this.getReviewRecord(m);
        reviewRecord.errors = [];
        if (validate) {
            const validateOptions = typeof validate === 'object' ? validate : {};
            try {
                const error = await this.chluIpfs.validator.validateReviewRecord(reviewRecord, validateOptions);
                if (error) reviewRecord.errors = reviewRecord.errors.concat(error);
            } catch (error) {
                this.chluIpfs.events.emit('validation error', error, m);
                throw error;
            }
        }
        if (checkForUpdates) this.watchReviewRecord(m, validate);
        const keyMultihash = this.chluIpfs.validator.keyLocationToKeyMultihash(reviewRecord.key_location);
        reviewRecord.editable = keyMultihash === this.chluIpfs.crypto.pubKeyMultihash;
        reviewRecord.multihash = m;
        reviewRecord.requestedMultihash = multihash;
        reviewRecord.watching = Boolean(checkForUpdates);
        reviewRecord.gotLatestVersion = Boolean(getLatestVersion);
        this.chluIpfs.events.emit('read ReviewRecord', {
            reviewRecord,
            multihash: m,
            requestedMultihash: multihash
        });
        return reviewRecord;
    }

    async prepareReviewRecord(reviewRecord, validate = true) {
        const keyPair = this.chluIpfs.crypto.keyPair;
        reviewRecord.key_location = '/ipfs/' + await this.chluIpfs.crypto.storePublicKey(keyPair.getPublicKeyBuffer());
        reviewRecord = this.setPointerToLastReviewRecord(reviewRecord);
        // Remove hash in case it's wrong (or this is an update). It's going to be calculated by the signing function
        reviewRecord.hash = '';
        reviewRecord = await this.chluIpfs.crypto.signReviewRecord(reviewRecord, keyPair);
        if (validate) await this.chluIpfs.validator.validateReviewRecord(reviewRecord);
        return reviewRecord;
    }

    async storeReviewRecord(reviewRecord, options = {}){
        const {
            previousVersionMultihash,
            publish = true,
            validate = true,
            useCache = true
        } = options;
        let rr = Object.assign({}, reviewRecord, {
            previous_version_multihash: previousVersionMultihash || ''
        });
        this.chluIpfs.logger.debug('Preparing review record');
        rr = await this.prepareReviewRecord(rr, validate);
        this.chluIpfs.logger.debug('Encoding (protobuf) review record');
        const buffer = protobuf.ReviewRecord.encode(rr);
        this.chluIpfs.logger.debug('Encoding (dagnode) review record');
        const dagNode = await this.chluIpfs.ipfsUtils.createDAGNode(buffer); // don't store to IPFS yet
        this.chluIpfs.logger.debug('Calculating review record multihash');
        const multihash = IPFSUtils.getDAGNodeMultihash(dagNode);
        if (options.expectedMultihash) {
            if (options.expectedMultihash !== multihash) {
                throw new Error('Expected a different multihash');
            }
        }
        if (validate && useCache) this.chluIpfs.cache.cacheValidity(multihash); 
        this.chluIpfs.events.emit('stored ReviewRecord', { multihash, reviewRecord: rr });
        if (publish) await this.publishReviewRecord(dagNode, previousVersionMultihash, multihash, rr);
        return multihash;
    }

    async publishReviewRecord(dagNode, previousVersionMultihash, expectedMultihash, reviewRecord) {
        this.chluIpfs.logger.debug('Storing review record in IPFS');
        // Broadcast request for pin, then wait for response
        // TODO: handle a timeout and also rebroadcast periodically, otherwise new peers won't see the message
        const multihash = await this.chluIpfs.ipfsUtils.storeDAGNode(dagNode); // store to IPFS
        if (expectedMultihash && multihash !== expectedMultihash) {
            throw new Error('Multihash mismatch when publishing');
        }
        this.chluIpfs.logger.debug('Stored review record ' + multihash + ' in IPFS');
        // Wait for it to be remotely pinned
        let tasksToAwait = [this.waitForRemotePin(multihash)];
        if (previousVersionMultihash) {
            // This is a review update
            tasksToAwait.push(this.setForwardPointerForReviewRecord(previousVersionMultihash, multihash, reviewRecord));
        } else {
            tasksToAwait.push(this.setReferenceForReviewRecord(multihash));
        }
        this.chluIpfs.logger.debug('Waiting for Publish tasks to complete for ' + multihash);
        await Promise.all(tasksToAwait);
        // Operation succeeded: set this as the last review record published
        this.chluIpfs.logger.debug('Publish of ' + multihash + ' succeded: executing post-publish tasks');
        this.chluIpfs.lastReviewRecordMultihash = multihash;
        await this.chluIpfs.persistence.persistData();
        this.chluIpfs.events.emit('published ReviewRecord', multihash);
        if (previousVersionMultihash) {
            this.notifyReviewUpdate(previousVersionMultihash, multihash, reviewRecord);
        }
        this.chluIpfs.logger.debug('Publish of ' + multihash + ' succeded: post-publish tasks executed');
    }

    async waitForRemotePin(multihash) {
        await this.chluIpfs.room.broadcastUntil({
            type: constants.eventTypes.wroteReviewRecord,
            multihash
        }, constants.eventTypes.pinned + '_' + multihash);
    }

    async setReferenceForReviewRecord(multihash) {
        this.chluIpfs.logger.debug('Setting OrbitDB reference to ' + multihash);
        try {
            await this.chluIpfs.orbitDb.setAndWaitForReplication(multihash);
        } catch (error) {
            this.chluIpfs.logger.error('OrbitDB Error: ' + error.message || error);
            throw error;
        }
        this.chluIpfs.logger.debug('Done setting reference, the db has been replicated remotely');
        return multihash;
    }

    async setForwardPointerForReviewRecord(previousVersionMultihash, multihash, reviewRecord) {
        this.chluIpfs.logger.debug('Setting forward pointer for ' + previousVersionMultihash + ' to ' + multihash);
        try {
            await this.chluIpfs.orbitDb.setAndWaitForReplication(multihash, previousVersionMultihash);
        } catch (error) {
            this.chluIpfs.logger.error('OrbitDB Error: ' + error.message || error);
            throw error;
        }
        this.chluIpfs.logger.debug('Done setting forward pointer, the db has been replicated remotely');
        this.chluIpfs.events.emit('updated ReviewRecord', previousVersionMultihash, multihash, reviewRecord);
        return multihash;
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
        if (typeof obj.signature !== 'undefined') {
            // Signature is applied after hashing, so remove it for hashing
            obj.signature = '';
        }
        this.chluIpfs.logger.debug('Preparing to hash the object: ' + JSON.stringify(obj));
        const toHash = encoder(obj); 
        const multihash = await new Promise((resolve, reject) => {
            multihashing(toHash, name, (err, multihash) => {
                if (err) reject(err); else resolve(multihash);
            });
        });
        obj.hash = multihashes.toB58String(multihash);
        if (typeof object.signature !== 'undefined') {
            // Restore signature if it was present originally
            obj.signature = object.signature;
        }
        this.chluIpfs.logger.debug('Hashed to ' + obj.hash + ' the object ' + JSON.stringify(obj));
        return obj;
    }

    async hashReviewRecord(reviewRecord) {
        // TODO: better checks
        if (!reviewRecord.last_reviewrecord_multihash) reviewRecord.last_reviewrecord_multihash = '';
        if (!reviewRecord.previous_version_multihash) reviewRecord.previous_version_multihash = '';
        return await this.hashObject(reviewRecord, protobuf.ReviewRecord.encode);
    }

    async hashPoPR(popr) {
        return await this.hashObject(popr, protobuf.PoPR.encode);
    }

    setPointerToLastReviewRecord(reviewRecord) {
        reviewRecord.last_reviewrecord_multihash = this.chluIpfs.lastReviewRecordMultihash || '';
        return reviewRecord;
    }

}

module.exports = ReviewRecords;