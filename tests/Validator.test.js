
const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const protons = require('protons');
const protobuf = protons(require('../src/utils/protobuf'));
const logger = require('./utils/logger');
const { getFakeReviewRecord } = require('./utils/protobuf');

describe.only('Validator Module', () => {
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
        reviewRecord = await chluIpfs.reviewRecords.setReviewRecordHash(reviewRecord);
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
        sinon.spy(chluIpfs.validator, 'validateReviewRecord');
        chluIpfs.validator.validateMultihash = sinon.stub().resolves();
        let reviewRecord = await getFakeReviewRecord();
        reviewRecord.previous_version_multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP1';
        let originalReviewRecord = Object.assign({}, reviewRecord);
        originalReviewRecord.previous_version_multihash = '';
        chluIpfs.reviewRecords.readReviewRecord = sinon.stub().resolves(originalReviewRecord);
        await chluIpfs.validator.validateReviewRecord(reviewRecord);
        expect(chluIpfs.reviewRecords.readReviewRecord.calledWith(reviewRecord.previous_version_multihash)).to.be.true;
    });
});