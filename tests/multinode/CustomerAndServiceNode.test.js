const expect = require('chai').expect;

const ChluIPFS = require('../../src/ChluIPFS.js');
const { getFakeReviewRecord } = require('../utils/protobuf');
const utils = require('../utils/ipfs');
const env = require('../../src/utils/env');
const rimraf = require('rimraf');
const sinon = require('sinon');
const logger = require('../utils/logger');
const cryptoTestUtils = require('../utils/crypto');
const fakeHttpModule = require('../utils/http');
const { cloneDeep } = require('lodash');

function withoutHashAndSig(obj) {
    return Object.assign({}, obj, {
        signature: '',
        hash: ''
    });
}

function strip(obj) {
    delete obj.gotLatestVersion;
    delete obj.multihash;
    delete obj.requestedMultihhash;
    delete obj.editable;
    delete obj.watching;
}

describe('Customer and Service Node integration', function() {
    let testDir, ipfsDir, customerNode, customerIpfs, serviceNode, serviceIpfs;
    let v, vm, m, makeKeyPair, preparePoPR;

    before(async () => {
        if (env.isNode()) {
            server = await require('../utils/nodejs').startRendezvousServer();
        }

        ipfsDir = env.isNode() ? '/tmp/chlu-test-ipfs-' + Date.now() + Math.random() + '/' : Date.now() + Math.random();
        serviceIpfs = await utils.createIPFS({ repo: ipfsDir + '/' + 'service' });
        customerIpfs = await utils.createIPFS({ repo: ipfsDir + '/' + 'customer' });

        // Connect the peers manually to speed up test times
        // await utils.connect(serviceNode.ipfs, customerNode.ipfs);
    });

    after(async () => {
        await Promise.all([serviceIpfs.stop(), customerIpfs.stop()]);
        if (env.isNode()) {
            rimraf.sync(ipfsDir);
        }
    });

    beforeEach(async () => {    

        testDir = env.isNode() ? '/tmp/chlu-test-' + Date.now() + Math.random() + '/' : Date.now() + Math.random();

        const serviceNodeDir = testDir + 'chlu-service-node';
        const customerDir = testDir + 'chlu-customer';

        serviceNode = new ChluIPFS({
            type: ChluIPFS.types.service,
            logger: logger('Service'),
            directory: serviceNodeDir,
            enablePersistence: false,
            bootstrap: false
        });
        customerNode = new ChluIPFS({
            type: ChluIPFS.types.customer,
            logger: logger('Customer'),
            directory: customerDir,
            enablePersistence: false,
            bootstrap: false
        });
        // Make sure they don't connect to production
        expect(customerNode.network).to.equal(ChluIPFS.networks.experimental);
        expect(serviceNode.network).to.equal(ChluIPFS.networks.experimental);

        serviceNode.ipfs = serviceIpfs;
        customerNode.ipfs = customerIpfs;
    
        await Promise.all([serviceNode.start(), customerNode.start()]);

        // Stubs
        const crypto = cryptoTestUtils(serviceNode);
        makeKeyPair = crypto.makeKeyPair;
        preparePoPR = crypto.preparePoPR;
        vm = await makeKeyPair();
        v = await makeKeyPair();
        m = await makeKeyPair();
        const http = fakeHttpModule(() => ({ multihash: m.multihash }));
        serviceNode.http = http;
        customerNode.http = http;
        serviceNode.ipfsUtils.stop = sinon.stub().resolves();
        customerNode.ipfsUtils.stop = sinon.stub().resolves();
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
        expect(strip(readRecord)).to.deep.equal(strip(customerRecord));
    });

    it('handles review updates', async () => {
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
        expect(strip(rr)).to.deep.equal(strip(rrUpdate));
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
        expect(strip(rrUpdate)).to.deep.equal(strip(rr));
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
                    expect(strip(rr)).to.deep.equal(strip(customerUpdate));
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
