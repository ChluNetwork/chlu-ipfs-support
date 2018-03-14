const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const protons = require('protons');
const protobuf = protons(require('../src/utils/protobuf'));
const { getFakeReviewRecord } = require('./utils/protobuf');
const logger = require('./utils/logger');
const { isValidMultihash } = require('../src/utils/ipfs');
const ipfsUtilsStub = require('./utils/ipfsUtilsStub');

describe('Customer', () => {

    let chluIpfs, fakeStore = {}; // not the real multihash

    beforeEach(async () => {
        chluIpfs = new ChluIPFS({
            type: ChluIPFS.types.customer,
            enablePersistence: false,
            logger: logger('Customer')
        });
        chluIpfs.waitUntilReady = sinon.stub().resolves();
        chluIpfs.orbitDb.db = { address: { toString: () => 'example' } };
        fakeStore = {};
        chluIpfs.ipfsUtils = ipfsUtilsStub(fakeStore);
        chluIpfs.crypto.generateKeyPair();
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
        await chluIpfs.room.start();
    });

    it('stores ReviewRecords and automatically publishes them', async () => {
        const reviewRecord = await getFakeReviewRecord();
        const result = await chluIpfs.storeReviewRecord(reviewRecord);
        const actual = chluIpfs.ipfsUtils.createDAGNode.args[0][0];
        expect(isValidMultihash(result)).to.be.true;
        expect(chluIpfs.ipfs.pubsub.publish.called).to.be.true;
        expect(chluIpfs.ipfsUtils.storeDAGNode.called).to.be.true;
        expect(protobuf.ReviewRecord.decode(actual).chlu_version).to.not.be.undefined;
    });

    it('can store ReviewRecords without publishing', async () => {
        const reviewRecord = await getFakeReviewRecord();
        const result = await chluIpfs.storeReviewRecord(reviewRecord, { publish: false });
        const actual = chluIpfs.ipfsUtils.createDAGNode.args[0][0];
        expect(isValidMultihash(result)).to.be.true;
        expect(chluIpfs.ipfs.pubsub.publish.called).to.be.false;
        expect(chluIpfs.ipfsUtils.storeDAGNode.called).to.be.false;
        expect(protobuf.ReviewRecord.decode(actual).chlu_version).to.not.be.undefined;
    });

    it('can store ReviewRecords without publishing then store them again and publish them', async () => {
        const reviewRecord = await getFakeReviewRecord();
        const result = await chluIpfs.storeReviewRecord(reviewRecord, { publish: false });
        let actual = chluIpfs.ipfsUtils.createDAGNode.args[0][0];
        expect(isValidMultihash(result)).to.be.true;
        expect(chluIpfs.ipfs.pubsub.publish.called).to.be.false;
        expect(protobuf.ReviewRecord.decode(actual).chlu_version).to.not.be.undefined;
        const newResult = await chluIpfs.storeReviewRecord(reviewRecord, { expectedMultihash: result });
        expect(chluIpfs.ipfs.pubsub.publish.called).to.be.true;
        expect(newResult).to.equal(result);
        actual = chluIpfs.ipfsUtils.createDAGNode.args[1][0];
        expect(protobuf.ReviewRecord.decode(actual).chlu_version).to.not.be.undefined;
    });

    it('correctly checks expected multihash when storing a review record', async () => {
        const reviewRecord = await getFakeReviewRecord();
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

    it('signs review records', async () => {
        // TODO: check that the signature and key_location are present and valid
        const reviewRecord = await getFakeReviewRecord();
        const multihash = await chluIpfs.storeReviewRecord(reviewRecord);
        const rr = await chluIpfs.readReviewRecord(multihash, { validate: false });
        expect(rr.key_location).to.equal('/ipfs/' + chluIpfs.crypto.pubKeyMultihash);
        expect(rr.signature).to.be.a('string');
    });

});