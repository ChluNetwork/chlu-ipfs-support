const expect = require('chai').expect;

const ChluIPFS = require('../../src/ChluIPFS.js');
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

    before(async () => {    
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
    
        await serviceNode.start();
        await customerNode.start();
    });

    after(async () => {
        // Disabled due uncatchable errors being thrown in the test environment
        //await customerNode.stop();
        //await serviceNode.stop();
        if (env.isNode()) {
            rimraf.sync(testDir);
        }
    });

    it('handles review records', async () => {
        // Create fake review record
        const reviewRecord = Buffer.from('Mock Review Record: ' + String(Math.random() + Date.now()));
        // Spy on pinning activity on the service node
        sinon.spy(serviceNode, 'pin');
        // store review record and await for completion
        const hash = await customerNode.storeReviewRecord(reviewRecord);
        // check hash validity
        expect(hash).to.be.a('string').that.is.not.empty;
        // the service node should already have pinned the hash
        expect(serviceNode.pin.calledWith(hash)).to.be.true;
        serviceNode.pin.restore();
    });

    it('handles review updates', async () => {
        const reviewUpdate = { value: 'mockreviewupdate' + Math.random()*1000 + Date.now() };
        await customerNode.publishUpdatedReview(reviewUpdate);
        const address = customerNode.getOrbitDBAddress();
        const customerFeedItems = customerNode.db.iterator().collect();
        expect(customerFeedItems[0].payload.value).to.deep.equal(reviewUpdate);
        const serviceNodeFeedItems = serviceNode.dbs[address].iterator().collect();
        expect(serviceNodeFeedItems[0].payload.value).to.deep.equal(reviewUpdate);
    });
});