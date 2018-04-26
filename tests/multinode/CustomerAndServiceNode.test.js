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
const btcUtils = require('../utils/bitcoin');
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
    let server, testDir, ipfsDir, customerNode, customerIpfs, serviceNode, serviceIpfs;
    let v, vm, m, makeKeyPair, preparePoPR;

    before(async () => {
        if (env.isNode()) {
            server = await require('../../src/utils/rendezvous').startRendezvousServer(ChluIPFS.rendezvousPorts.test);
        }

        ipfsDir = env.isNode() ? '/tmp/chlu-test-ipfs-' + Date.now() + Math.random() + '/' : Date.now() + Math.random();
        serviceIpfs = await utils.createIPFS({ repo: ipfsDir + '/' + 'service' });
        customerIpfs = await utils.createIPFS({ repo: ipfsDir + '/' + 'customer' });

        // Connect the peers manually to speed up test times
        // await utils.connect(serviceNode.ipfs, customerNode.ipfs);

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
        serviceNode.bitcoin.Blockcypher = btcUtils.BlockcypherMock;
        customerNode.bitcoin.Blockcypher = btcUtils.BlockcypherMock;

        await Promise.all([serviceNode.start(), customerNode.start()]);
    });

    after(async () => {
        await Promise.all([serviceNode.stop(), customerNode.stop()]);
        if (env.isNode()) {
            await server.stop();
            rimraf.sync(testDir);
        }
    });

    function setupBtcMock(multihash, rr) {
        // delete cached info, since we are about to change it
        serviceNode.cache.cache.del(btcUtils.exampleTransaction.hash);
        customerNode.cache.cache.del(btcUtils.exampleTransaction.hash);
        // tell mock btc module to return a TX that matches the RR
        serviceNode.bitcoin.api.returnMatchingTXForRR(Object.assign({}, rr, { multihash }));
        customerNode.bitcoin.api.returnMatchingTXForRR(Object.assign({}, rr, { multihash }));
    }

    it('handles review records', async () => {
        // Create fake review record
        let reviewRecord = await getFakeReviewRecord();
        reviewRecord.popr = await preparePoPR(reviewRecord.popr, vm, v, m);
        // Spy on pinning activity on the service node
        sinon.spy(serviceNode.pinning, 'pin');
        // store review record and await for completion
        const hash = await customerNode.storeReviewRecord(reviewRecord, {
            publish: false
        });
        // set up btc mock to return the right content
        setupBtcMock(hash, reviewRecord);
        // publish
        await customerNode.storeReviewRecord(reviewRecord, {
            bitcoinTransactionHash: btcUtils.exampleTransaction.hash
        });
        const customerRecord = await customerNode.readReviewRecord(hash);
        expect(customerRecord.editable).to.be.true;
        // check hash validity
        expect(hash).to.be.a('string').that.is.not.empty;
        // the service node should already have pinned the hash
        expect(serviceNode.pinning.pin.calledWith(hash)).to.be.true;
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
        const multihash = await customerNode.storeReviewRecord(reviewRecord, {
            publish: false
        });
        setupBtcMock(multihash, reviewRecord);
        await customerNode.storeReviewRecord(reviewRecord, {
            bitcoinTransactionHash: btcUtils.exampleTransaction.hash
        });
        // Check that the review list is updated
        expect(customerNode.orbitDb.getReviewRecordList()[0]).to.equal(multihash);
        // Store the update
        const updatedMultihash = await customerNode.storeReviewRecord(reviewUpdate, {
            previousVersionMultihash: multihash
        });
        const rr = await serviceNode.readReviewRecord(multihash, { getLatestVersion: true });
        const rrUpdate = await serviceNode.readReviewRecord(updatedMultihash);
        expect(strip(rr)).to.deep.equal(strip(rrUpdate));
    });

    it('handles review updates happening after calling readReviewRecord', async () => {
        await new Promise(async (resolve, reject) => {
            // Create fake review record
            let reviewRecord = await getFakeReviewRecord();
            reviewRecord.popr = await preparePoPR(reviewRecord.popr, vm, v, m);
            // Store the original review
            const multihash = await customerNode.storeReviewRecord(reviewRecord, {
                publish: false
            });
            setupBtcMock(multihash, reviewRecord);
            await customerNode.storeReviewRecord(reviewRecord, {
                bitcoinTransactionHash: btcUtils.exampleTransaction.hash
            });
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
            serviceNode.events.once('reviewrecord/updated', notifyUpdate);
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
        const multihash = await customerNode.storeReviewRecord(reviewRecord, {
            publish: false
        });
        setupBtcMock(multihash, reviewRecord);
        await customerNode.storeReviewRecord(reviewRecord, {
            bitcoinTransactionHash: btcUtils.exampleTransaction.hash
        });
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
            const multihash = await customerNode.storeReviewRecord(reviewRecord, {
                publish: false
            });
            setupBtcMock(multihash, reviewRecord);
            await customerNode.storeReviewRecord(reviewRecord, {
                bitcoinTransactionHash: btcUtils.exampleTransaction.hash
            });
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
            customerNode.events.once('reviewrecord/updated', notifyUpdate);
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
