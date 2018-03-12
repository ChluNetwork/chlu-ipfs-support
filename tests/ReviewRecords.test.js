const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');

const protons = require('protons');
const protobuf = protons(require('../src/utils/protobuf'));
const { getFakeReviewRecord } = require('./utils/protobuf');
const multihashes = require('multihashes');
const { isValidMultihash } = require('../src/utils/ipfs');
const cloneDeep = require('lodash.clonedeep');
const ipfsUtilsStub = require('./utils/ipfsUtilsStub');

describe('ReviewRecords module', () => {

    it('reads ReviewRecords from IPFS', async () => {
        const fakeReviewRecord = await getFakeReviewRecord();
        const multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPQ'; // not the real multihash
        const multihashBuffer = multihashes.fromB58String(multihash);
        const buffer = protobuf.ReviewRecord.encode(fakeReviewRecord);
        const ipfs = {
            object: {
                get: sinon.stub().resolves({ data: buffer })
            }
        };
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false, logger: logger('Customer') });
        chluIpfs.waitUntilReady = sinon.stub().resolves();
        chluIpfs.ipfs = ipfs;
        const reviewRecord = await chluIpfs.readReviewRecord(multihash, { validate: false });
        expect(ipfs.object.get.args[0][0]).to.deep.equal(multihashBuffer);
        expect(reviewRecord).to.not.be.undefined;
        expect(reviewRecord.chlu_version).to.not.be.undefined;
    });

    it('recognizes valid and invalid multihashes', async () => {
        let multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPQ';
        expect(isValidMultihash(multihash)).to.be.true;
        expect(isValidMultihash(multihashes.fromB58String(multihash))).to.be.true;
        expect(isValidMultihash('blah')).to.be.false;
        expect(isValidMultihash({ notEvenA: 'multihash'})).to.be.false;
    });

    it('sets the last review record multihash into new reviews and updates it after storing the review', async () => {
        const fakeReviewRecord = await getFakeReviewRecord();
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false, logger: logger('Customer') });
        chluIpfs.waitUntilReady = sinon.stub().resolves();
        const lastReviewRecordMultihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPZ';
        chluIpfs.lastReviewRecordMultihash = lastReviewRecordMultihash.slice(0); // make a copy
        const fakeStore = {};
        chluIpfs.ipfsUtils = ipfsUtilsStub(fakeStore);
        chluIpfs.getOrbitDBAddress = () => 'example data';
        chluIpfs.reviewRecords.setForwardPointerForReviewRecord = sinon.stub().resolves();
        chluIpfs.reviewRecords.waitForRemotePin = sinon.stub().resolves();
        chluIpfs.crypto.generateKeyPair();
        const multihash = await chluIpfs.storeReviewRecord(fakeReviewRecord);
        const reviewRecord = protobuf.ReviewRecord.decode(chluIpfs.ipfsUtils.storeDAGNode.args[0][0].data);
        expect(reviewRecord.last_reviewrecord_multihash).to.deep.equal(lastReviewRecordMultihash);
        expect(chluIpfs.lastReviewRecordMultihash).to.deep.equal(multihash);
    });
    
    it('computes the ReviewRecord hash', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false, logger: logger('Customer') });
        chluIpfs.waitUntilReady = sinon.stub().resolves();
        const reviewRecord = await getFakeReviewRecord();
        reviewRecord.hash = 'fake';
        const hashedReviewRecord = await chluIpfs.reviewRecords.hashReviewRecord(reviewRecord);
        expect(hashedReviewRecord.hash).not.to.equal(reviewRecord.hash);
        const hashedAgain = await chluIpfs.reviewRecords.hashReviewRecord(reviewRecord);
        expect(hashedAgain.hash).to.equal(hashedReviewRecord.hash);
        multihashes.validate(multihashes.fromB58String(hashedReviewRecord.hash)); // throws if invalid
    });

    it('can rebuild the history of an updated ReviewRecord', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false, logger: logger('Customer') });
        chluIpfs.waitUntilReady = sinon.stub().resolves();
        const reviewRecord = await getFakeReviewRecord();
        const reviewRecord2 = await getFakeReviewRecord();
        reviewRecord2.previous_version_multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP1';
        const reviewRecord3 = await getFakeReviewRecord();
        reviewRecord3.previous_version_multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP2';
        let map = {
            'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP1': reviewRecord,
            'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP2': reviewRecord2
        };
        chluIpfs.reviewRecords.getReviewRecord = sinon.stub().callsFake(async multihash => {
            return map[multihash];
        });
        const history = await chluIpfs.reviewRecords.getHistory(reviewRecord3);
        expect(history.map(o => o.multihash)).to.deep.equal(Object.keys(map).reverse());
        expect(history.map(o => o.reviewRecord)).to.deep.equal(Object.values(map).reverse());
        // Check that the recursive history detection works
        map = {
            'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP1': reviewRecord,
            'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP2': reviewRecord2,
            'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP3': reviewRecord3
        };
        reviewRecord.previous_version_multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP3';
        chluIpfs.reviewRecords.getReviewRecord = sinon.stub().callsFake(async multihash => {
            return map[multihash];
        });
        let error;
        try {
            await chluIpfs.reviewRecords.getHistory(reviewRecord3);
        } catch (err) {
            error = err;
        }
        expect(error).to.not.be.undefined;
    });

    it('hashes consistently in weird edge cases', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false, logger: logger('Customer') });
        chluIpfs.waitUntilReady = sinon.stub().resolves();
        const reviewRecord = await getFakeReviewRecord();
        reviewRecord.last_reviewrecord_multihash = '';

        const hashedReviewRecord = await chluIpfs.reviewRecords.hashReviewRecord(cloneDeep(reviewRecord));
        const rrGoneThroughEncoding = protobuf.ReviewRecord.decode(protobuf.ReviewRecord.encode(reviewRecord));
        const hashedAgain = await chluIpfs.reviewRecords.hashReviewRecord(cloneDeep(rrGoneThroughEncoding));
        expect(hashedReviewRecord.hash).to.equal(hashedAgain.hash);

        delete reviewRecord.last_reviewrecord_multihash;
        const hashedAgain2 = await chluIpfs.reviewRecords.hashReviewRecord(cloneDeep(reviewRecord));
        expect(hashedReviewRecord.hash).to.equal(hashedAgain2.hash);
    });
});