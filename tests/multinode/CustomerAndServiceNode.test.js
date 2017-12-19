const expect = require('chai').expect;

const ChluIPFS = require('../../src/ChluIPFS.js');
const utils = require('../utils/ipfs');
const rimraf = require('rimraf');
const logger = require('../utils/logger');

const serviceNodeRepo = '/tmp/chlu-service-node-repo';
const customerRepo = '/tmp/chlu-customer-repo';
describe('Customer and Service Node interoperability', () => {
    let customerNode, serviceNode;

    before(async () => {    
        serviceNode = new ChluIPFS({ type: ChluIPFS.types.service, logger });
        customerNode = new ChluIPFS({ type: ChluIPFS.types.customer, logger });

        serviceNode.ipfs = await utils.createIPFS({ repo: serviceNodeRepo });
        customerNode.ipfs = await utils.createIPFS({ repo: customerRepo });

        // Connect the peers manually to speed up test times
        await utils.connect(serviceNode.ipfs, customerNode.ipfs);
    
        await serviceNode.start();
        await customerNode.start();
    });

    after(async () => {
        // Disabled due uncatchable errors being thrown in the test environment
        //await customerNode.stop();
        //await serviceNode.stop();
        rimraf.sync(serviceNodeRepo);
        rimraf.sync(customerRepo);
    });

    it('handles review records', async () => {
        const reviewRecord = Buffer.from('Mock Review Record: ' + String(Math.random() + Date.now()));
        const hash = await customerNode.storeReviewRecord(reviewRecord);
        expect(hash).to.be.a('string').that.is.not.empty;
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