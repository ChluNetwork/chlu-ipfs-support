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
                    throw new Error('Recursive references detected in this OrbitDB: ' + db.address.toString());
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
            notifyUpdate(multihash, updatedMultihash);
        }
    }

    async findLastReviewRecordUpdate(multihash, notifyUpdate) {
        const reviewRecord = await this.getReviewRecord(multihash);
        if (reviewRecord.orbitDb) {
            const db = await this.chluIpfs.orbitDb.openDbForReplication(reviewRecord.orbitDb);
            db.events.once('replicated', () => this.notifyIfReviewIsUpdated(db, multihash, notifyUpdate));
            this.notifyIfReviewIsUpdated(db, multihash, notifyUpdate);
        }
    }

    async getHistory(reviewRecord, history = []) {
        const prev = reviewRecord.previous_version_multihash;
        if (prev) {
            if (history.indexOf(prev) >= 0) {
                throw new Error('Recursive history detected');
            }
            history.push(prev);
            const prevReviewRecord = await this.chluIpfs.reviewRecords.readReviewRecord(prev, { validate: false });
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
            this.chluIpfs.validator.validateReviewRecord(reviewRecord, validateOptions);
        }
        if (notifyUpdate) this.findLastReviewRecordUpdate(multihash, notifyUpdate);
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
        reviewRecord = await this.setReviewRecordHash(reviewRecord);
        if (validate) await this.chluIpfs.validator.validateReviewRecord(reviewRecord);
        return protobuf.ReviewRecord.encode(reviewRecord);
    }

    async storeReviewRecord(reviewRecord, options = {}){
        const {
            previousVersionMultihash,
            publish = true,
            validate = true
        } = options;
        const buffer = await this.prepareReviewRecord(reviewRecord, validate);
        const dagNode = await this.chluIpfs.ipfsUtils.createDAGNode(buffer); // don't store to IPFS yet
        const multihash = IPFSUtils.getDAGNodeMultihash(dagNode);
        if (options.expectedMultihash) {
            if (options.expectedMultihash !== multihash) {
                throw new Error('Expected a different multihash');
            }
        }
        if (publish) await this.publishReviewRecord(dagNode, previousVersionMultihash);
        return multihash;
    }

    async publishReviewRecord(dagNode, previousVersionMultihash) {
        // Broadcast request for pin, then wait for response
        // TODO: handle a timeout and also rebroadcast periodically, otherwise new peers won't see the message
        const multihash = await this.chluIpfs.ipfsUtils.storeDAGNode(dagNode); // store to IPFS
        // Wait for it to be remotely pinned
        let tasksToAwait = [this.waitForRemotePin(multihash)];
        if (previousVersionMultihash) {
            // This is a review update
            tasksToAwait.push(this.setForwardPointerForReviewRecord(previousVersionMultihash, multihash));
        }
        await Promise.all(tasksToAwait);
        // Operation succeeded: set this as the last review record published
        this.chluIpfs.lastReviewRecordMultihash = multihash;
        await this.chluIpfs.persistence.persistData();
    }

    async waitForRemotePin(multihash) {
        await new Promise(fullfill => {
            this.chluIpfs.events.once(constants.eventTypes.pinned + '_' + multihash, () => fullfill());
            this.chluIpfs.room.broadcast({ type: constants.eventTypes.wroteReviewRecord, multihash });
        });
    }

    async setForwardPointerForReviewRecord(previousVersionMultihash, multihash) {
        this.chluIpfs.logger.debug('Setting forward pointer for ' + previousVersionMultihash + ' to ' + multihash);
        // TODO: verify that the update is valid
        await new Promise(async fullfill => {
            const address = this.chluIpfs.getOrbitDBAddress();
            this.chluIpfs.events.once(constants.eventTypes.replicated + '_' + address, () => fullfill());
            try {
                await this.chluIpfs.orbitDb.db.set(previousVersionMultihash, multihash);
            } catch (error) {
                this.chluIpfs.logger.error('OrbitDB Error: ' + error.message || error);
            }
            this.chluIpfs.room.broadcastReviewUpdates();
            this.chluIpfs.logger.debug('Waiting for remote replication');
        });
        this.chluIpfs.logger.debug('Done setting forward pointer, the db has been replicated remotely');
        return multihash;
    }

    async setReviewRecordHash(reviewRecord) {
        let name;
        try {
            // Try to detect existing multihash type
            const multihash = multihashes.fromB58String(reviewRecord.hash);
            const decoded = multihashes.decode(multihash);
            name = decoded.name;
        } catch (error) {
            // Use default
            name = 'sha2-256';
        }
        reviewRecord.hash = '';
        const toHash = protobuf.ReviewRecord.encode(reviewRecord); 
        const multihash = await new Promise((fullfill, reject) => {
            multihashing(toHash, name, (err, multihash) => {
                if (err) reject(err); else fullfill(multihash);
            });
        });
        reviewRecord.hash = multihashes.toB58String(multihash);
        return reviewRecord;
    }

    setPointerToLastReviewRecord(reviewRecord) {
        if (this.chluIpfs.lastReviewRecordMultihash) {
            reviewRecord.last_reviewrecord_multihash = this.chluIpfs.lastReviewRecordMultihash;
        }
        return reviewRecord;
    }

}

module.exports = ReviewRecords;