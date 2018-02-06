const protons = require('protons');
const constants = require('../constants');
const protobuf = protons(require('../utils/protobuf'));
const { storeBuffer, multihashToString } = require('../utils/ipfs');

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
                    throw new Error('Recursive references detected in this OrbitDB: ' + db.address.toString())
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

    async getReviewRecord(multihash){
        const dagNode = await this.chluIpfs.ipfs.object.get(this.chluIpfs.utils.multihashToBuffer(multihash));
        const buffer = dagNode.data;
        return protobuf.ReviewRecord.decode(buffer);
    }

    async readReviewRecord(multihash, notifyUpdate = null) {
        this.chluIpfs.utils.validateMultihash(multihash);
        const reviewRecord = await this.getReviewRecord(multihash);
        // TODO: validate
        if (notifyUpdate) this.findLastReviewRecordUpdate(multihash, notifyUpdate);
        return reviewRecord;
    }

    prepareReviewRecord(reviewRecord) {
        // TODO: validate
        if(this.chluIpfs.type === constants.types.customer) {
            reviewRecord.orbitDb = this.chluIpfs.getOrbitDBAddress();
        } else if (!reviewRecord.orbitDb) {
            throw new Error('Can not set the orbitDb address since this is not a customer');
        }
        reviewRecord = this.setPointerToLastReviewRecord(reviewRecord);
        return protobuf.ReviewRecord.encode(reviewRecord);
    }

    async addReviewRecordToIPFS(buffer) {
        return await storeBuffer(this.chluIpfs.ipfs, buffer);
    }

    async storeReviewRecord(reviewRecord, options = {}){
        const defaultOptions = {
            publish: true
        };
        const opt = Object.assign({}, defaultOptions, options);
        const { previousVersionMultihash, publish } = opt;
        const buffer = this.prepareReviewRecord(reviewRecord);
        // write thing to ipfs
        const multihash = await this.addReviewRecordToIPFS(buffer);
        if (options.expectedMultihash) {
            if (multihashToString(options.expectedMultihash) !== multihashToString(multihash)) {
                throw new Error('Expected a different multihash');
            }
        }
        if (publish) await this.publishReviewRecord(multihash, previousVersionMultihash);
        return multihash;
    }

    async publishReviewRecord(multihash, previousVersionMultihash) {
        // Broadcast request for pin, then wait for response
        // TODO: handle a timeout and also rebroadcast periodically, otherwise new peers won't see the message
        let tasksToAwait = [this.waitForRemotePin(multihash)];
        if (previousVersionMultihash) {
            // This is a review update
            tasksToAwait.push(this.setForwardPointerForReviewRecord(previousVersionMultihash, multihash));
        }
        await Promise.all(tasksToAwait);
        // Store operation succeeded: set this as the last review record published
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

    setPointerToLastReviewRecord(reviewRecord) {
        if (this.chluIpfs.lastReviewRecordMultihash) {
            reviewRecord.last_reviewrecord_multihash = this.chluIpfs.lastReviewRecordMultihash;
        }
        return reviewRecord;
    }

}

module.exports = ReviewRecords;