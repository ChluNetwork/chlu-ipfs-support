#!/usr/bin/env node

// due to https://github.com/indutny/brorand/pull/5 brorand does not work in this env so we need to mock it
// this is used by OrbitDB to generate keys
jest.mock('brorand', () => {
    const crypto = require('crypto');
    return jest.fn(n => crypto.randomBytes(n));
});

const ChluIPFS = require('../src/ChluIPFS.js');
const utils = require('./utils/ipfs');
const Repo = require('ipfs-repo');

describe('Customer and Service Node interoperability', () => {
    // increase timeout since these tests use real IPFS instances
    jest.setTimeout(20000);

    let customerNode, serviceNode;

    beforeAll(async () => {
        const serviceNodeRepo = new Repo('/tmp/chlu-service-node-repo');
        const customerRepo = new Repo('/tmp/chlu-customer-repo');
    
        serviceNode = new ChluIPFS({ type: ChluIPFS.types.service });
        serviceNode.ipfs = await utils.createIPFS({ repo: serviceNodeRepo });
    
        customerNode = new ChluIPFS({ type: ChluIPFS.types.customer });
        customerNode.ipfs = await utils.createIPFS({ repo: customerRepo });
    
        // Connect the peers manually to speed up test times
        await utils.connect(serviceNode.ipfs, customerNode.ipfs);
    
        await serviceNode.start();
        await customerNode.start();
    });

    it('handles review records', async () => {
        const reviewRecord = Buffer.from('Mock Review Record: ' + String(Math.random() + Date.now()));
        const hash = await customerNode.storeReviewRecord(reviewRecord);
        expect(hash).toBeTruthy();
    });

    it('handles review updates', async () => {
        const reviewUpdate = { value: 'mockreviewupdate' };
        await customerNode.publishUpdatedReview(reviewUpdate);
        const address = customerNode.getOrbitDBAddress();
        const customerFeedItems = customerNode.db.iterator().collect();
        expect(customerFeedItems[0].payload.value).toEqual(reviewUpdate);
        const serviceNodeFeedItems = serviceNode.dbs[address].iterator().collect();
        expect(serviceNodeFeedItems[0].payload.value).toEqual(reviewUpdate);
    });
});