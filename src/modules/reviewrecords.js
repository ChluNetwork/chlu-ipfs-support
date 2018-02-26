const protons = require('protons');
const multihashes = require('multihashes');
const multihashing = require('multihashing-async');
const constants = require('../constants');
const protobuf = protons(require('../utils/protobuf'));
const IPFSUtils = require('./ipfs');

class ReviewRecords {

    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
    }

    async getLastReviewRecordUpdate(db, multihash) {
        this.chluIpfs.logger.debug('Checking for review updates for ' + multihash);
        let dbValue = multihash, updatedMultihash = multihash, path = [multihash];
        while (dbValue) {
            dbValue = await db.get(dbValue);
            if (typeof dbValue === 'string') {
                if (path.indexOf(dbValue) < 0) {
                    updatedMultihash = dbValue;
                    path.push(dbValue);
                    this.chluIpfs.logger.debug('Found forward pointer from ' + multihash + ' to ' + updatedMultihash);
                } else {
                    const error = new Error('Recursive references detected in this OrbitDB: ' + db.address.toString());
                    this.chluIpfs.events.emit('error', error);
                    throw error;
                }
            }
        }
        if (multihash != updatedMultihash) {
            this.chluIpfs.logger.debug(multihash + ' updates to ' + updatedMultihash);
            return updatedMultihash;
        } else {
            this.chluIpfs.logger.debug('no updates found for ' + multihash);
        }
    }

    async notifyIfReviewIsUpdated(db, multihash, notifyUpdate) {
        const updatedMultihash = await this.getLastReviewRecordUpdate(db, multihash);
        if (updatedMultihash) {
            // TODO: Check that the update is valid first
            try {
                const reviewRecord = await this.readReviewRecord(updatedMultihash);
                notifyUpdate(multihash, updatedMultihash, reviewRecord);
            } catch (error) {
                this.chluIpfs.logger.error('Review update ' + updatedMultihash + ' for ' + multihash + ' was invalid: ' + error);
            }
        }
    }

    async findLastReviewRecordUpdate(multihash, notifyUpdate) {
        const reviewRecord = await this.getReviewRecord(multihash);
        if (reviewRecord.orbitDb) {
            let db;
            if (this.chluIpfs.orbitDb.getPersonalDBAddress() === reviewRecord.orbitDb) {
                db = this.chluIpfs.orbitDb.db;
            } else {
                db = await this.chluIpfs.orbitDb.openDbForReplication(reviewRecord.orbitDb);
            }
            const notify = () => this.notifyIfReviewIsUpdated(db, multihash, notifyUpdate);
            db.events.on('replicated', notify);
            this.chluIpfs.events.on('updated ReviewRecord', notify);
            notify();
        }
    }

    async getHistory(reviewRecord, history = []) {
        const prev = reviewRecord.previous_version_multihash;
        if (prev) {
            if (history.map(o => o.multihash).indexOf(prev) >= 0) {
                throw new Error('Recursive history detected');
            }
            const prevReviewRecord = await this.chluIpfs.reviewRecords.readReviewRecord(prev, { validate: false });
            history.push({
                multihash: prev,
                reviewRecord: prevReviewRecord
            });
            return await this.getHistory(prevReviewRecord, history);
        } else {
            return history;
        }
    }

    async getReviewRecord(multihash){
        const buffer = await this.chluIpfs.ipfsUtils.get(multihash);
        return protobuf.ReviewRecord.decode(buffer);
    }

    async readReviewRecord(multihash, options = {}) {
        const {
            notifyUpdate = null,
            validate = true
        } = options;
        IPFSUtils.validateMultihash(multihash);
        const reviewRecord = await this.getReviewRecord(multihash);
        if (validate) {
            const validateOptions = typeof validate === 'object' ? validate : {};
            try {
                await this.chluIpfs.validator.validateReviewRecord(reviewRecord, validateOptions);
            } catch (error) {
                this.chluIpfs.events.emit('validation error', error, multihash);
                throw error;
            }
        }
        if (notifyUpdate) this.findLastReviewRecordUpdate(multihash, notifyUpdate);
        this.chluIpfs.events.emit('read ReviewRecord', { reviewRecord, multihash });
        return reviewRecord;
    }

    async prepareReviewRecord(reviewRecord, validate = true) {
        // TODO: validate
        if(this.chluIpfs.type === constants.types.customer) {
            reviewRecord.orbitDb = this.chluIpfs.getOrbitDBAddress();
        } else if (!reviewRecord.orbitDb) {
            throw new Error('Can not set the orbitDb address since this is not a customer');
        }
        reviewRecord = this.setPointerToLastReviewRecord(reviewRecord);
        reviewRecord = await this.hashReviewRecord(reviewRecord);
        if (validate) await this.chluIpfs.validator.validateReviewRecord(reviewRecord);
        return reviewRecord;
    }

    async storeReviewRecord(reviewRecord, options = {}){
        const {
            previousVersionMultihash,
            publish = true,
            validate = true
        } = options;
        const rr = await this.prepareReviewRecord(reviewRecord, validate);
        const buffer = protobuf.ReviewRecord.encode(rr);
        const dagNode = await this.chluIpfs.ipfsUtils.createDAGNode(buffer); // don't store to IPFS yet
        const multihash = IPFSUtils.getDAGNodeMultihash(dagNode);
        if (options.expectedMultihash) {
            if (options.expectedMultihash !== multihash) {
                throw new Error('Expected a different multihash');
            }
        }
        this.chluIpfs.events.emit('stored ReviewRecord', { multihash, reviewRecord: rr });
        if (publish) await this.publishReviewRecord(dagNode, previousVersionMultihash, multihash, rr);
        return multihash;
    }

    async publishReviewRecord(dagNode, previousVersionMultihash, expectedMultihash, reviewRecord) {
        // Broadcast request for pin, then wait for response
        // TODO: handle a timeout and also rebroadcast periodically, otherwise new peers won't see the message
        const multihash = await this.chluIpfs.ipfsUtils.storeDAGNode(dagNode); // store to IPFS
        if (expectedMultihash && multihash !== expectedMultihash) {
            throw new Error('Multihash mismatch when publishing');
        }
        // Wait for it to be remotely pinned
        let tasksToAwait = [this.waitForRemotePin(multihash)];
        if (previousVersionMultihash) {
            // This is a review update
            tasksToAwait.push(this.setForwardPointerForReviewRecord(previousVersionMultihash, multihash, reviewRecord));
        }
        await Promise.all(tasksToAwait);
        // Operation succeeded: set this as the last review record published
        this.chluIpfs.lastReviewRecordMultihash = multihash;
        await this.chluIpfs.persistence.persistData();
        this.chluIpfs.events.emit('published ReviewRecord', multihash);
    }

    async waitForRemotePin(multihash) {
        await this.chluIpfs.room.broadcastUntil({
            type: constants.eventTypes.wroteReviewRecord,
            multihash
        }, constants.eventTypes.pinned + '_' + multihash);
    }

    async setForwardPointerForReviewRecord(previousVersionMultihash, multihash, reviewRecord) {
        this.chluIpfs.logger.debug('Setting forward pointer for ' + previousVersionMultihash + ' to ' + multihash);
        // TODO: verify that the update is valid
        await new Promise(async resolve => {
            this.chluIpfs.room.broadcastReviewUpdates().then(() => resolve());
            try {
                await this.chluIpfs.orbitDb.db.set(previousVersionMultihash, multihash);
            } catch (error) {
                this.chluIpfs.logger.error('OrbitDB Error: ' + error.message || error);
            }
            this.chluIpfs.logger.debug('Waiting for remote replication');
        });
        this.chluIpfs.logger.debug('Done setting forward pointer, the db has been replicated remotely');
        this.chluIpfs.events.emit('updated ReviewRecord', previousVersionMultihash, multihash, reviewRecord);
        return multihash;
    }

    async hashObject(obj, encoder) {
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
        const toHash = encoder(obj); 
        const multihash = await new Promise((resolve, reject) => {
            multihashing(toHash, name, (err, multihash) => {
                if (err) reject(err); else resolve(multihash);
            });
        });
        obj.hash = multihashes.toB58String(multihash);
        return obj;
    }

    async hashReviewRecord(reviewRecord) {
        return await this.hashObject(reviewRecord, protobuf.ReviewRecord.encode);
    }

    async hashPoPR(popr) {
        return await this.hashObject(popr, protobuf.PoPR.encode);
    }

    setPointerToLastReviewRecord(reviewRecord) {
        if (this.chluIpfs.lastReviewRecordMultihash) {
            reviewRecord.last_reviewrecord_multihash = this.chluIpfs.lastReviewRecordMultihash;
        }
        return reviewRecord;
    }

}

module.exports = ReviewRecords;