const expect = require('chai').expect;

const ChluIPFS = require('../../src/ChluIPFS.js');
const { getFakeReviewRecord } = require('../utils/protobuf');
const utils = require('../utils/ipfs');
const env = require('../../src/utils/env');
const rimraf = require('rimraf');
const sinon = require('sinon');
const logger = require('../utils/logger');
const cryptoTestUtils = require('../utils/crypto');
const cloneDeep = require('lodash.clonedeep');
const { milliseconds } = require('../../src/utils/timing');

const testDir = '/tmp/chlu-test-' + Date.now() + Math.random();

const serviceNodeDir = testDir + '/chlu-service-node';
const customerDir = testDir + '/chlu-customer';

function withoutHashAndSig(obj) {
    return Object.assign({}, obj, {
        signature: '',
        hash: ''
    });
}

describe('Customer and Service Node integration', function() {
    let customerNode, serviceNode, server, v, vm, m, makeKeyPair, preparePoPR;

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

        // Stubs
        const crypto = cryptoTestUtils(serviceNode);
        makeKeyPair = crypto.makeKeyPair;
        preparePoPR = crypto.preparePoPR;
        vm = await makeKeyPair();
        v = await makeKeyPair();
        m = await makeKeyPair();
        const fetchMarketplaceKey = sinon.stub().resolves(m.multihash);
        serviceNode.validator.fetchMarketplaceKey = fetchMarketplaceKey;
        customerNode.validator.fetchMarketplaceKey = fetchMarketplaceKey;
        
        // Wait some time (TODO: remove this when it's fixed in ipfs/libp2p)
        await milliseconds(3000);
    });

    afterEach(async () => {
        try {
            await customerNode.stop();
            await serviceNode.stop();
        } catch (error) {
            console.log('[WARN] An error has occured while stopping ChluIPFS');
            console.trace(error);
        }
        if (env.isNode()) {
            rimraf.sync(testDir);
        } else {
            indexedDB.deleteDatabase(customerNode.orbitDbDirectory);
            indexedDB.deleteDatabase(serviceNode.orbitDbDirectory);
        }
        customerNode = undefined;
        serviceNode = undefined;
    });

    it('handles review records', async () => {
        // Create fake review record
        let reviewRecord = await getFakeReviewRecord();
        reviewRecord.popr = await preparePoPR(reviewRecord.popr, vm, v, m);
        // Spy on pinning activity on the service node
        sinon.spy(serviceNode.pinning, 'pin');
        // store review record and await for completion
        const hash = await customerNode.storeReviewRecord(reviewRecord);
        const customerRecord = await customerNode.readReviewRecord(hash);
        expect(customerRecord.editable).to.be.true;
        // check hash validity
        expect(hash).to.be.a('string').that.is.not.empty;
        // the service node should already have pinned the hash
        expect(serviceNode.pinning.pin.called).to.be.true;
        // check that reading works
        const readRecord = await serviceNode.readReviewRecord(hash);
        expect(readRecord.editable).to.be.false;
        readRecord.editable = true; // otherwise equality won't pass
        expect(readRecord).to.deep.equal(customerRecord);
    });

    it.only('handles review updates', async () => {
        // Create fake review record
        let reviewRecord = await getFakeReviewRecord();
        reviewRecord.popr = await preparePoPR(reviewRecord.popr, vm, v, m);
        // Now create a fake update
        let reviewUpdate = await getFakeReviewRecord();
        reviewUpdate.popr = cloneDeep(reviewRecord.popr);
        reviewUpdate.review_text = 'Actually it broke after just a week!';
        reviewUpdate.rating = 1;
        // Store the original review
        const multihash = await customerNode.storeReviewRecord(reviewRecord);
        // Check that the review list is correct
        expect(customerNode.orbitDb.getReviewRecordList()).to.deep.equal([multihash]);
        // Store the update
        const updatedMultihash = await customerNode.storeReviewRecord(reviewUpdate, {
            previousVersionMultihash: multihash
        });
        const rr = await serviceNode.readReviewRecord(multihash, { getLatestVersion: true });
        const rrUpdate = await serviceNode.readReviewRecord(updatedMultihash);
        expect(rr).to.deep.equal(rrUpdate);
        // Check that the review list is correct
        expect(customerNode.orbitDb.getReviewRecordList()).to.deep.equal([multihash]);
    });

    it('handles review updates happening after calling readReviewRecord', async () => {
        await new Promise(async (resolve, reject) => {
            // Create fake review record
            let reviewRecord = await getFakeReviewRecord();
            reviewRecord.popr = await preparePoPR(reviewRecord.popr, vm, v, m);
            // Store the original review
            const multihash = await customerNode.storeReviewRecord(reviewRecord);
            // Now try to fetch it from the service node while checking for updates
            const notifyUpdate = async (originalHash, newHash, rr) => {
                try {
                    expect(newHash).to.not.equal(multihash);
                    expect(originalHash).to.equal(multihash);
                    expect(withoutHashAndSig(rr)).to.not.deep.equal(reviewRecord);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };
            serviceNode.events.on('updated ReviewRecord', notifyUpdate);
            await serviceNode.readReviewRecord(multihash, { checkForUpdates: true });
            // Now create a fake update
            let reviewUpdate = await getFakeReviewRecord();
            reviewUpdate.popr = cloneDeep(reviewRecord.popr);
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
        let reviewRecord = await getFakeReviewRecord();
        reviewRecord.popr = await preparePoPR(reviewRecord.popr, vm, v, m);
        // Now create a fake update
        let reviewUpdate = await getFakeReviewRecord();
        reviewUpdate.popr = cloneDeep(reviewRecord.popr);
        reviewUpdate.review_text = 'Actually it broke after just a week!';
        reviewUpdate.rating = 1;
        // Store the original review
        const multihash = await customerNode.storeReviewRecord(reviewRecord);
        // Store the update
        const updatedMultihash = await customerNode.storeReviewRecord(reviewUpdate, {
            previousVersionMultihash: multihash
        });
        const rr = await customerNode.readReviewRecord(multihash, { getLatestVersion: true });
        const rrUpdate = await customerNode.readReviewRecord(updatedMultihash);
        expect(rrUpdate).to.deep.equal(rr);
    });

    it('handles review updates written by the current node but that happened after the read', async () => {
        await new Promise(async (resolve, reject) => {
            // Create fake review record
            let reviewRecord = await getFakeReviewRecord();
            reviewRecord.popr = await preparePoPR(reviewRecord.popr, vm, v, m);
            // Store the original review
            const multihash = await customerNode.storeReviewRecord(reviewRecord);
            // Now try to fetch it from the customer node while checking for updates
            const notifyUpdate = async (originalHash, newHash, rr) => {
                try {
                    expect(newHash).to.not.equal(multihash);
                    expect(originalHash).to.equal(multihash);
                    expect(rr.previous_version_multihash).to.equal(originalHash);
                    const customerUpdate = await customerNode.readReviewRecord(newHash);
                    delete customerUpdate.editable; // otherwise the equality check fails
                    expect(rr).to.deep.equal(customerUpdate);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };
            customerNode.events.on('updated ReviewRecord', notifyUpdate);
            await customerNode.readReviewRecord(multihash, { checkForUpdates: true });
            // Now create a fake update
            let reviewUpdate = await getFakeReviewRecord();
            reviewUpdate.popr = cloneDeep(reviewRecord.popr);
            reviewUpdate.review_text = 'Actually it broke after just a week!';
            reviewUpdate.rating = 1;
            // Store the update
            await customerNode.storeReviewRecord(reviewUpdate, {
                previousVersionMultihash: multihash
            });
        });
    });
});
