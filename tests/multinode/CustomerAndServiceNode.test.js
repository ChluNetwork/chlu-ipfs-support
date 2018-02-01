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

describe('Customer and Service Node interoperability', () => {
    let customerNode, serviceNode;

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

        if (env.isNode()) {
            // Connect the peers manually to speed up test times
            // In the browser it doesn't work since they can only connect via WebSocket relay and not directly
            await utils.connect(serviceNode.ipfs, customerNode.ipfs);
        }
    
        await Promise.all([serviceNode.start(), customerNode.start()]);
    });

    afterEach(async () => {
        await Promise.all([customerNode.stop(), serviceNode.stop()]);
        if (env.isNode()) {
            rimraf.sync(testDir);
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
        serviceNode.pinning.pin.restore();
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
        const updatedMultihash = await customerNode.storeReviewRecord(reviewUpdate, multihash);
        // Now try to fetch it from the service node while checking for updates
        await new Promise(fullfill => {
            serviceNode.readReviewRecord(multihash, (originalHash, newHash) => {
                expect(newHash).to.deep.equal(updatedMultihash);
                fullfill();
            });
        });
    });
});