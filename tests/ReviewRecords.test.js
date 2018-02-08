const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');

const protons = require('protons');
const protobuf = protons(require('../src/utils/protobuf'));
const { getFakeReviewRecord } = require('./utils/protobuf');
const multihashes = require('multihashes');
const { isValidMultihash } = require('../src/utils/ipfs');

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
        chluIpfs.ipfs = ipfs;
        const reviewRecord = await chluIpfs.readReviewRecord(multihash);
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
        const multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPQ';
        const fakeReviewRecord = await getFakeReviewRecord();
        const buffer = protobuf.ReviewRecord.encode(fakeReviewRecord);
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false, logger: logger('Customer') });
        const lastReviewRecordMultihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPZ';
        chluIpfs.lastReviewRecordMultihash = lastReviewRecordMultihash.slice(0); // make a copy
        chluIpfs.ipfsUtils = {
            get: sinon.stub().resolves({ data: buffer }),
            createDAGNode: sinon.stub().callsFake(async buf => { return { data: buf, multihash }; }),
            storeDAGNode: sinon.stub().resolves(multihash),
            getDAGNodeMultihash: sinon.stub().returns(multihash)
        };
        chluIpfs.getOrbitDBAddress = () => 'example data';
        chluIpfs.reviewRecords.setForwardPointerForReviewRecord = sinon.stub().resolves();
        chluIpfs.reviewRecords.waitForRemotePin = sinon.stub().resolves();
        await chluIpfs.storeReviewRecord(fakeReviewRecord);
        const reviewRecord = protobuf.ReviewRecord.decode(chluIpfs.ipfsUtils.storeDAGNode.args[0][0].data);
        expect(chluIpfs.lastReviewRecordMultihash).to.deep.equal(multihash);
        expect(reviewRecord.last_reviewrecord_multihash).to.deep.equal(lastReviewRecordMultihash);
    });
    
    it('computes the ReviewRecord hash', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false, logger: logger('Customer') });
        const reviewRecord = await getFakeReviewRecord();
        reviewRecord.hash = 'fake';
        const hashedReviewRecord = await chluIpfs.reviewRecords.setReviewRecordHash(Object.assign({}, reviewRecord));
        expect(hashedReviewRecord.hash).not.to.equal(reviewRecord.hash);
        multihashes.validate(multihashes.fromB58String(hashedReviewRecord.hash)); // throws if invalid
    });

});