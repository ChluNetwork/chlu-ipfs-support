const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const { getFakeReviewRecord, makeUnverified } = require('./utils/protobuf');
const logger = require('./utils/logger');
const { isValidMultihash } = require('../src/utils/ipfs');
const ipfsUtilsStub = require('./utils/ipfsUtilsStub');
const http = require('./utils/http');
const cryptoTestUtils = require('./utils/crypto');

describe('ReviewRecord storing and publishing', () => {

    let chluIpfs, fakeStore = {}, vm, v, m, preparePoPR;

    beforeEach(async () => {
        chluIpfs = new ChluIPFS({
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
        expect(chluIpfs.did.publish.called).to.be.true
        chluIpfs.did.publish.resetHistory()
        const didMap = crypto.buildDIDMap([v, m, chluIpfs.did.export() ])
        chluIpfs.did.getDID = sinon.stub().callsFake(async id => didMap[id])
        // Other mocks
        chluIpfs.http = http(() => ({ didId: m.publicDidDocument.id }));
        chluIpfs.validator.validateBitcoinTransaction = sinon.stub().resolves();
    });

    it('stores and publishes Unverified Reviews', async () => {
        const reviewRecord = makeUnverified(await getFakeReviewRecord())
        const result = await chluIpfs.storeReviewRecord(reviewRecord)
        expect(isValidMultihash(result)).to.be.true;
        // TODO: test signatures and fields like issuer
        expect(chluIpfs.did.publish.called).to.be.true
        expect(chluIpfs.ipfs.pubsub.publish.called).to.be.true;
        expect(chluIpfs.ipfsUtils.storeDAGNode.called).to.be.true;
    })

    it('stores Reviews and automatically publishes them', async () => {
        const reviewRecord = await getFakeReviewRecord();
        delete reviewRecord.issuer // force Chlu to sign it as issuer
        reviewRecord.popr = await preparePoPR(reviewRecord.popr, vm, v, m);
        const result = await chluIpfs.storeReviewRecord(reviewRecord, {
            bitcoinTransactionHash: 'test'
        });
        expect(isValidMultihash(result)).to.be.true;
        expect(chluIpfs.did.publish.called).to.be.true
        expect(chluIpfs.ipfs.pubsub.publish.called).to.be.true;
        expect(chluIpfs.ipfsUtils.storeDAGNode.called).to.be.true;
    });

    it('can store Review without publishing', async () => {
        const reviewRecord = await getFakeReviewRecord();
        delete reviewRecord.issuer // force Chlu to sign it as issuer
        reviewRecord.popr = await preparePoPR(reviewRecord.popr, vm, v, m);
        const result = await chluIpfs.storeReviewRecord(reviewRecord, { publish: false });
        expect(isValidMultihash(result)).to.be.true;
        expect(chluIpfs.did.publish.called).to.be.false
        expect(chluIpfs.ipfs.pubsub.publish.called).to.be.false;
        expect(chluIpfs.ipfsUtils.storeDAGNode.called).to.be.false;
    });

    it('can store Reviews without publishing then store them again and publish them', async () => {
        const reviewRecord = await getFakeReviewRecord();
        delete reviewRecord.issuer // force Chlu to sign it as issuer
        reviewRecord.popr = await preparePoPR(reviewRecord.popr, vm, v, m);
        const result = await chluIpfs.storeReviewRecord(reviewRecord, { publish: false });
        expect(isValidMultihash(result)).to.be.true;
        expect(chluIpfs.ipfs.pubsub.publish.called).to.be.false;
        expect(chluIpfs.did.publish.called).to.be.false
        const newResult = await chluIpfs.storeReviewRecord(reviewRecord, {
            expectedMultihash: result,
            bitcoinTransactionHash: 'test'
        });
        expect(chluIpfs.ipfs.pubsub.publish.called).to.be.true;
        expect(chluIpfs.did.publish.called).to.be.true
        expect(newResult).to.equal(result);
    });

    it('correctly checks expected multihash when storing a review', async () => {
        const reviewRecord = await getFakeReviewRecord();
        delete reviewRecord.issuer // force Chlu to sign it as issuer
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

    it('signs Unverified reviews correctly', async () => {
        async function verifySignature(rr, didId, field) {
            expect(rr[field].type).to.equal('did:chlu')
            expect(rr[field].creator).to.equal(didId)
            expect(rr[field].created).to.be.a('number')
            expect(rr[field].signatureValue).to.be.a('string')
            const valid = await chluIpfs.did.verifyMultihash(didId, rr.hash, rr[field]);
            expect(valid).to.be.true;
        }
        const reviewRecord = makeUnverified(await getFakeReviewRecord())
        const multihash = await chluIpfs.storeReviewRecord(reviewRecord);
        const rr = await chluIpfs.readReviewRecord(multihash);
        expect(rr.issuer).to.equal(chluIpfs.did.didId);
        expect(rr.customer_siganture).to.be.undefined
        await verifySignature(rr, chluIpfs.did.didId, 'issuer_signature')
    });

    it('signs Verified reviews correctly', async () => {
        async function verifySignature(rr, didId, field) {
            expect(rr[field].type).to.equal('did:chlu')
            expect(rr[field].creator).to.equal(didId)
            expect(rr[field].created).to.be.a('number')
            expect(rr[field].signatureValue).to.be.a('string')
            const valid = await chluIpfs.did.verifyMultihash(didId, rr.hash, rr[field]);
            expect(valid).to.be.true;
        }
        const reviewRecord = await getFakeReviewRecord();
        reviewRecord.popr = await preparePoPR(reviewRecord.popr, vm, v, m);
        const multihash = await chluIpfs.storeReviewRecord(reviewRecord, {
            bitcoinTransactionHash: 'test'
        });
        const rr = await chluIpfs.readReviewRecord(multihash);
        expect(rr.issuer).to.equal(chluIpfs.did.didId);
        await verifySignature(rr, chluIpfs.did.didId, 'issuer_signature')
        await verifySignature(rr, chluIpfs.did.didId, 'customer_signature')
    });

});