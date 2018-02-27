const expect = require('chai').expect;

const ChluIPFS = require('../../src/ChluIPFS.js');
const { getFakeReviewRecord } = require('../utils/protobuf');
const utils = require('../utils/ipfs');
const env = require('../../src/utils/env');
const rimraf = require('rimraf');
const sinon = require('sinon');
const logger = require('../utils/logger');

const testDir = '/tmp/chlu-test-' + Date.now() + Math.random();

const serviceNodeDir = testDir + '/chlu-service-node';
const customerDir = testDir + '/chlu-customer';

describe('Customer and Service Node integration', function() {
    let customerNode, serviceNode, server;

    before(async () => {
        if (env.isNode()) {
            server = await require('../utils/nodejs').startRendezvousServer();
        }
    });

    after(async () => {
        if (env.isNode()) {
            await server.stop();
        }
    });

    beforeEach(async () => {    
        serviceNode = new ChluIPFS({
            type: ChluIPFS.types.service,
            logger: logger('Service'),
            directory: serviceNodeDir,
            enablePersistence: false
        });
        customerNode = new ChluIPFS({
            type: ChluIPFS.types.customer,
            logger: logger('Customer'),
            directory: customerDir,
            enablePersistence: false
        });

        serviceNode.ipfs = await utils.createIPFS({ repo: serviceNode.ipfsOptions.repo });
        customerNode.ipfs = await utils.createIPFS({ repo: customerNode.ipfsOptions.repo });

        // Connect the peers manually to speed up test times
        await utils.connect(serviceNode.ipfs, customerNode.ipfs);
    
        await Promise.all([serviceNode.start(), customerNode.start()]);
    });

    afterEach(async () => {
        const indexedDBName = customerNode.orbitDbDirectory;
        await Promise.all([customerNode.stop(), serviceNode.stop()]);
        if (env.isNode()) {
            rimraf.sync(testDir);
        } else {
            indexedDB.deleteDatabase(indexedDBName);
        }
        customerNode = undefined;
        serviceNode = undefined;
    });

    it('handles review records', async () => {
        // Create fake review record
        const reviewRecord = await getFakeReviewRecord();
        // Spy on pinning activity on the service node
        sinon.spy(serviceNode.pinning, 'pin');
        // store review record and await for completion
        const hash = await customerNode.storeReviewRecord(reviewRecord);
        // check hash validity
        expect(hash).to.be.a('string').that.is.not.empty;
        // the service node should already have pinned the hash
        expect(serviceNode.pinning.pin.called).to.be.true;
        // check that reading works
        const readRecord = await serviceNode.readReviewRecord(hash);
        expect(readRecord).to.deep.equal(reviewRecord);
    });

    it('handles review updates', async () => {
        // Create fake review record
        const reviewRecord = await getFakeReviewRecord();
        // Now create a fake update
        const reviewUpdate = await getFakeReviewRecord();
        reviewUpdate.review_text = 'Actually it broke after just a week!';
        reviewUpdate.rating = 1;
        // Store the original review
        const multihash = await customerNode.storeReviewRecord(reviewRecord);
        // Store the update
        const updatedMultihash = await customerNode.storeReviewRecord(reviewUpdate, {
            previousVersionMultihash: multihash
        });
        // Now try to fetch it from the service node while checking for updates
        await new Promise(resolve => {
            const notifyUpdate = async (originalHash, newHash, rr) => {
                expect(newHash).to.deep.equal(updatedMultihash);
                expect(rr).to.deep.equal(reviewUpdate);
                resolve();
            };
            serviceNode.readReviewRecord(multihash, { notifyUpdate });
        });
    });

    it('handles review updates happening after calling readReviewRecord', async () => {
        await new Promise(async resolve => {
            // Create fake review record
            const reviewRecord = await getFakeReviewRecord();
            // Store the original review
            const multihash = await customerNode.storeReviewRecord(reviewRecord);
            // Now try to fetch it from the service node while checking for updates
            const notifyUpdate = async (originalHash, newHash, rr) => {
                expect(newHash).to.not.equal(multihash);
                expect(originalHash).to.equal(multihash);
                expect(rr).to.not.deep.equal(reviewRecord);
                resolve();
            };
            await serviceNode.readReviewRecord(multihash, { notifyUpdate });
            // Now create a fake update
            const reviewUpdate = await getFakeReviewRecord();
            reviewUpdate.review_text = 'Actually it broke after just a week!';
            reviewUpdate.rating = 1;
            // Store the update
            await customerNode.storeReviewRecord(reviewUpdate, {
                previousVersionMultihash: multihash
            });
        });
    });

    it('handles review updates written by the current node', async () => {
        // Create fake review record
        const reviewRecord = await getFakeReviewRecord();
        // Now create a fake update
        const reviewUpdate = await getFakeReviewRecord();
        reviewUpdate.review_text = 'Actually it broke after just a week!';
        reviewUpdate.rating = 1;
        // Store the original review
        const multihash = await customerNode.storeReviewRecord(reviewRecord);
        // Store the update
        const updatedMultihash = await customerNode.storeReviewRecord(reviewUpdate, {
            previousVersionMultihash: multihash
        });
        // Now try to fetch it from the service node while checking for updates
        await new Promise(resolve => {
            const notifyUpdate = async (originalHash, newHash, rr) => {
                expect(newHash).to.deep.equal(updatedMultihash);
                expect(rr).to.deep.equal(reviewUpdate);
                resolve();
            };
            customerNode.readReviewRecord(multihash, { notifyUpdate });
        });
    });

    it('handles review updates written by the current node but that happened after the read', async () => {
        await new Promise(async resolve => {
            // Create fake review record
            const reviewRecord = await getFakeReviewRecord();
            // Store the original review
            const multihash = await customerNode.storeReviewRecord(reviewRecord);
            // Now try to fetch it from the service node while checking for updates
            const notifyUpdate = async (originalHash, newHash, rr) => {
                expect(newHash).to.not.equal(multihash);
                expect(originalHash).to.equal(multihash);
                expect(rr).to.not.deep.equal(reviewRecord);
                resolve();
            };
            await customerNode.readReviewRecord(multihash, { notifyUpdate });
            // Now create a fake update
            const reviewUpdate = await getFakeReviewRecord();
            reviewUpdate.review_text = 'Actually it broke after just a week!';
            reviewUpdate.rating = 1;
            // Store the update
            await customerNode.storeReviewRecord(reviewUpdate, {
                previousVersionMultihash: multihash
            });
        });
    });
});