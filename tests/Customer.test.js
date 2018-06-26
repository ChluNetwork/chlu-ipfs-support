const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const protons = require('protons');
const protobuf = protons(require('../src/utils/protobuf'));
const { getFakeReviewRecord } = require('./utils/protobuf');
const logger = require('./utils/logger');
const { isValidMultihash } = require('../src/utils/ipfs');
const ipfsUtilsStub = require('./utils/ipfsUtilsStub');
const http = require('./utils/http');
const cryptoTestUtils = require('./utils/crypto');

describe.only('Customer', () => {

    let chluIpfs, fakeStore = {}, vm, v, m, preparePoPR;

    beforeEach(async () => {
        chluIpfs = new ChluIPFS({
            type: ChluIPFS.types.customer,
            enablePersistence: false,
            logger: logger('Customer'),
            cache: {
                enabled: false
            }
        });
        chluIpfs.waitUntilReady = sinon.stub().resolves();
        chluIpfs.orbitDb.db = { address: { toString: () => 'example' } };
        fakeStore = {};
        chluIpfs.ipfsUtils = ipfsUtilsStub(fakeStore);
        // Mock publish: fake a response so that the call can complete
        const publish = sinon.stub().callsFake(async (topic, msg) => {
            const obj = JSON.parse(msg.toString());
            expect(obj.type).to.equal(ChluIPFS.eventTypes.wroteReviewRecord);
            expect(isValidMultihash(obj.multihash)).to.be.true;
            setTimeout(() => {
                chluIpfs.events.emit(ChluIPFS.eventTypes.pinned + '_' + obj.multihash);
            }, 0);
        });
        chluIpfs.ipfs = {
            pubsub: {
                subscribe: sinon.stub(),
                peers: sinon.stub().resolves(['FakePeer']),
                publish
            }
        };
        chluIpfs.orbitDb.putReviewRecordAndWaitForReplication = sinon.stub().resolves();
        chluIpfs.orbitDb.getReviewRecordMetadata = sinon.stub().returns({
            bitcoinTransactionHash: 'fake'
        });
        await chluIpfs.room.start();
        // Crypto
        chluIpfs.crypto.generateKeyPair();
        const crypto = cryptoTestUtils(chluIpfs);
        const makeKeyPair = crypto.makeKeyPair;
        const makeDID = crypto.makeDID 
        preparePoPR = crypto.preparePoPR;
        vm = await makeKeyPair();
        v = await makeDID();
        m = await makeDID();
        // DID 
        chluIpfs.did.publish = sinon.stub().resolves()
        await chluIpfs.did.start()
        const didMap = crypto.buildDIDMap([v, m, chluIpfs.did.export() ])
        chluIpfs.did.getDID = sinon.stub().callsFake(async id => didMap[id])
        // Other mocks
        chluIpfs.http = http(() => ({ didId: m.publicDidDocument.id }));
        chluIpfs.validator.validateBitcoinTransaction = sinon.stub().resolves();
    });

    it.only('stores ReviewRecords and automatically publishes them', async () => {
        const reviewRecord = await getFakeReviewRecord();
        reviewRecord.popr = await preparePoPR(reviewRecord.popr, vm, v, m);
        console.log(reviewRecord.popr)
        const result = await chluIpfs.storeReviewRecord(reviewRecord, {
            bitcoinTransactionHash: 'test'
        });
        const actual = chluIpfs.ipfsUtils.createDAGNode.args[0][0];
        expect(isValidMultihash(result)).to.be.true;
        expect(chluIpfs.ipfs.pubsub.publish.called).to.be.true;
        expect(chluIpfs.ipfsUtils.storeDAGNode.called).to.be.true;
        expect(protobuf.ReviewRecord.decode(actual).chlu_version).to.not.be.undefined;
    });

    it('can store ReviewRecords without publishing', async () => {
        const reviewRecord = await getFakeReviewRecord();
        reviewRecord.popr = await preparePoPR(reviewRecord.popr, vm, v, m);
        const result = await chluIpfs.storeReviewRecord(reviewRecord, { publish: false });
        const actual = chluIpfs.ipfsUtils.createDAGNode.args[0][0];
        expect(isValidMultihash(result)).to.be.true;
        expect(chluIpfs.ipfs.pubsub.publish.called).to.be.false;
        expect(chluIpfs.ipfsUtils.storeDAGNode.called).to.be.false;
        expect(protobuf.ReviewRecord.decode(actual).chlu_version).to.not.be.undefined;
    });

    it('can store ReviewRecords without publishing then store them again and publish them', async () => {
        const reviewRecord = await getFakeReviewRecord();
        reviewRecord.popr = await preparePoPR(reviewRecord.popr, vm, v, m);
        const result = await chluIpfs.storeReviewRecord(reviewRecord, { publish: false });
        let actual = chluIpfs.ipfsUtils.createDAGNode.args[0][0];
        expect(isValidMultihash(result)).to.be.true;
        expect(chluIpfs.ipfs.pubsub.publish.called).to.be.false;
        expect(protobuf.ReviewRecord.decode(actual).chlu_version).to.not.be.undefined;
        const newResult = await chluIpfs.storeReviewRecord(reviewRecord, {
            expectedMultihash: result,
            bitcoinTransactionHash: 'test'
        });
        expect(chluIpfs.ipfs.pubsub.publish.called).to.be.true;
        expect(newResult).to.equal(result);
        actual = chluIpfs.ipfsUtils.createDAGNode.args[1][0];
        expect(protobuf.ReviewRecord.decode(actual).chlu_version).to.not.be.undefined;
    });

    it('correctly checks expected multihash when storing a review record', async () => {
        const reviewRecord = await getFakeReviewRecord();
        reviewRecord.popr = await preparePoPR(reviewRecord.popr, vm, v, m);
        let errorMessage, multihash;
        try {
            multihash = await chluIpfs.storeReviewRecord(reviewRecord, { publish: false, expectedMultihash: 'test' });
        } catch (error) {
            errorMessage = error.message;
        }
        expect(errorMessage).to.equal('Expected a different multihash');
        errorMessage = null;
        try {
            await chluIpfs.storeReviewRecord(reviewRecord, { publish: false, expectedMultihash: multihash });
        } catch (error) {
            errorMessage = error.message;
        }
        expect(errorMessage).to.be.null;
    });

    it('signs review records correctly', async () => {
        const reviewRecord = await getFakeReviewRecord();
        reviewRecord.popr = await preparePoPR(reviewRecord.popr, vm, v, m);
        const multihash = await chluIpfs.storeReviewRecord(reviewRecord, {
            bitcoinTransactionHash: 'test'
        });
        const rr = await chluIpfs.readReviewRecord(multihash);
        expect(rr.customer_did_id).to.equal(chluIpfs.did.didId);
        expect(rr.signature).to.be.a('string');
        const valid = await chluIpfs.did.verifyMultihash(chluIpfs.did.didId, rr.hash, rr.signature);
        expect(valid).to.be.true;
    });

});