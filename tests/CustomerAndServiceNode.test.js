#!/usr/bin/env node

// due to https://github.com/indutny/brorand/pull/5 brorand does not work in this env so we need to mock it
// this is used by OrbitDB to generate keys
jest.mock('brorand', () => {
    const crypto = require('crypto');
    return jest.fn(n => crypto.randomBytes(n));
});

const ChluIPFS = require('../src/index.js');
const utils = require('./utils/ipfs');
const Repo = require('ipfs-repo');

describe('Customer and Service Node interoperability', () => {
    // increase timeout since these tests use real IPFS instances
    jest.setTimeout(20000);

    let customerNode, serviceNode;

    beforeEach(async () => {
        const serviceNodeRepo = new Repo('/tmp/chlu-service-node-repo');
        const customerRepo = new Repo('/tmp/chlu-customer-repo');
    
        serviceNode = new ChluIPFS({ type: ChluIPFS.types.service });
        serviceNode.instance.ipfs = await utils.createIPFS({ repo: serviceNodeRepo });
    
        customerNode = new ChluIPFS({ type: ChluIPFS.types.customer });
        customerNode.instance.ipfs = await utils.createIPFS({ repo: customerRepo });
    
        // Connect the peers manually to speed up test times
        await utils.connect(serviceNode.instance.ipfs, customerNode.instance.ipfs);
    
        await serviceNode.start();
        await customerNode.start();
    });

    afterEach(async () => {
        await serviceNode.stop();
        //await customerNode.stop(); // TODO: this is broken atm because pubsub throws an error if we try to close it.
        customerNode = undefined;
        serviceNode = undefined;
    });

    it('handles review records', async () => {
        const reviewRecord = Buffer.from('Mock Review Record: ' + String(Math.random() + Date.now()));
        const hash = await customerNode.storeReviewRecord(reviewRecord);
        expect(hash).toBeTruthy();
    });
});