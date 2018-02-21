const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const protons = require('protons');
const protobuf = protons(require('../src/utils/protobuf'));
const logger = require('./utils/logger');
const { getFakeReviewRecord } = require('./utils/protobuf');

describe('Validator Module', () => {
    let chluIpfs;

    beforeEach(() => {
        chluIpfs = new ChluIPFS({
            type: ChluIPFS.types.service,
            enablePersistence: false,
            logger: logger('Customer')
        });
    });

    it('performs all validations', async () => {
        const reviewRecord = await getFakeReviewRecord();
        chluIpfs.validator.validateMultihash = sinon.stub().resolves();
        chluIpfs.validator.validateHistory = sinon.stub().resolves();
        await chluIpfs.validator.validateReviewRecord(reviewRecord);
        expect(chluIpfs.validator.validateMultihash.called).to.be.true;
        expect(chluIpfs.validator.validateHistory.called).to.be.true;
    });

    it('is called by default but can be disabled', async () => {
        sinon.spy(chluIpfs.validator, 'validateReviewRecord');
        const reviewRecord = await getFakeReviewRecord();
        const multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPQ'; // not the real multihash
        const buffer = protobuf.ReviewRecord.encode(reviewRecord);
        chluIpfs.ipfsUtils = {
            get: sinon.stub().resolves({ data: buffer }),
            createDAGNode: sinon.stub().callsFake(async buf => { return { data: buf, multihash }; }),
            storeDAGNode: sinon.stub().resolves(multihash),
            getDAGNodeMultihash: sinon.stub().returns(multihash)
        };
        chluIpfs.waitUntilReady = sinon.stub().resolves();
        await chluIpfs.storeReviewRecord(reviewRecord, {
            publish: false
        });
        expect(chluIpfs.validator.validateReviewRecord.called).to.be.true;
        chluIpfs.validator.validateReviewRecord.reset();
        await chluIpfs.storeReviewRecord(reviewRecord, {
            publish: false,
            validate: false
        });
        expect(chluIpfs.validator.validateReviewRecord.called).to.be.false;
    });

    it('validates the internal multihash correctly', async () => {
        sinon.spy(chluIpfs.validator, 'validateMultihash');
        let reviewRecord = await getFakeReviewRecord();
        reviewRecord = await chluIpfs.reviewRecords.hashReviewRecord(reviewRecord);
        await chluIpfs.validator.validateReviewRecord(reviewRecord);
        expect(chluIpfs.validator.validateMultihash.called).to.be.true;
        chluIpfs.validator.validateMultihash.reset();
        reviewRecord.hash = 'this hash is wrong on purpose';
        let error;
        try {
            await chluIpfs.validator.validateReviewRecord(reviewRecord);
        } catch (err) {
            error = err;
        }
        expect(error.message).to.equal('Mismatching hash');
        expect(chluIpfs.validator.validateMultihash.called).to.be.true;
    });

    it('validates ancestors', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false, logger: logger('Customer') });
        const reviewRecord = await getFakeReviewRecord();
        reviewRecord.rating = 1;
        const reviewRecord2 = await getFakeReviewRecord();
        reviewRecord2.rating = 2;
        reviewRecord2.previous_version_multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP1';
        const reviewRecord3 = await getFakeReviewRecord();
        reviewRecord3.rating = 3;
        reviewRecord3.previous_version_multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP2';
        let map = {
            'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP1': reviewRecord,
            'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP2': reviewRecord2
        };
        chluIpfs.reviewRecords.getReviewRecord = sinon.stub().callsFake(async multihash => {
            return map[multihash];
        });
        chluIpfs.validator.validateMultihash = sinon.stub().resolves(); // disable since we don't need it for this test
        sinon.spy(chluIpfs.validator, 'validatePrevious');
        await chluIpfs.validator.validateReviewRecord(reviewRecord3);
        expect(chluIpfs.validator.validatePrevious.calledWith(reviewRecord3, reviewRecord2)).to.be.true;
        expect(chluIpfs.validator.validatePrevious.calledWith(reviewRecord2, reviewRecord)).to.be.true;
        expect(chluIpfs.validator.validatePrevious.callCount).to.equal(2);
        expect(chluIpfs.reviewRecords.getReviewRecord.calledWith(reviewRecord3.previous_version_multihash)).to.be.true;
        // Test failure cases
        chluIpfs.validator.validateMultihash.reset();
        chluIpfs.validator.validatePrevious.reset();
        chluIpfs.validator.validatePrevious.reset();
        // Change review2 to be an invalid update
        reviewRecord2.customer_address = 'changed';
        let error;
        try {
            await chluIpfs.validator.validateReviewRecord(reviewRecord3);
        } catch (err) {
            error = err;
        }
        expect(error.message).to.equal('customer_address has changed');
    });
});