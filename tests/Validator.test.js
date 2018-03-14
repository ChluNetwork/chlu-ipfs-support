const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');
const { getFakeReviewRecord } = require('./utils/protobuf');
const cloneDeep = require('lodash.clonedeep');
const cryptoTestUtils = require('./utils/crypto');
const ipfsUtilsStub = require('./utils/ipfsUtilsStub');

describe('Validator Module', () => {
    let chluIpfs;

    beforeEach(() => {
        chluIpfs = new ChluIPFS({
            type: ChluIPFS.types.service,
            enablePersistence: false,
            logger: logger('Customer')
        });
        // TODO: instead of disabling explicitly other validators in tests,
        // make a system to explicity enable only the validator that needs to be tested
    });

    it('performs all validations', async () => {
        const reviewRecord = await getFakeReviewRecord();
        chluIpfs.validator.validateVersion = sinon.stub().resolves();
        chluIpfs.validator.validateRRSignature = sinon.stub().resolves();
        chluIpfs.validator.validatePoPRSignaturesAndKeys = sinon.stub().resolves();
        chluIpfs.validator.validateMultihash = sinon.stub().resolves();
        chluIpfs.validator.validateHistory = sinon.stub().resolves();
        await chluIpfs.validator.validateReviewRecord(reviewRecord);
        expect(chluIpfs.validator.validateMultihash.called).to.be.true;
        expect(chluIpfs.validator.validateHistory.called).to.be.true;
        expect(chluIpfs.validator.validateVersion.called).to.be.true;
        expect(chluIpfs.validator.validatePoPRSignaturesAndKeys.called).to.be.true;
        expect(chluIpfs.validator.validateRRSignature.called).to.be.true;
    });

    it('is called by default but can be disabled', async () => {
        chluIpfs.validator.validateReviewRecord = sinon.stub().resolves();
        const reviewRecord = await getFakeReviewRecord();
        const fakeStore = {};
        chluIpfs.ipfsUtils = ipfsUtilsStub(fakeStore);
        chluIpfs.waitUntilReady = sinon.stub().resolves();
        chluIpfs.crypto.generateKeyPair();
        await chluIpfs.storeReviewRecord(reviewRecord, {
            publish: false
        });
        expect(chluIpfs.validator.validateReviewRecord.called).to.be.true;
        chluIpfs.validator.validateReviewRecord.resetHistory();
        await chluIpfs.storeReviewRecord(reviewRecord, {
            publish: false,
            validate: false
        });
        expect(chluIpfs.validator.validateReviewRecord.called).to.be.false;
    });

    it('validates the internal multihash correctly', async () => {
        chluIpfs.validator.validateVersion = sinon.stub().resolves();
        chluIpfs.validator.validateRRSignature = sinon.stub().resolves();
        chluIpfs.validator.validatePoPRSignaturesAndKeys = sinon.stub().resolves();
        chluIpfs.validator.validateHistory = sinon.stub().resolves();
        sinon.spy(chluIpfs.validator, 'validateMultihash');
        let reviewRecord = await getFakeReviewRecord();
        reviewRecord = await chluIpfs.reviewRecords.hashReviewRecord(reviewRecord);
        await chluIpfs.validator.validateReviewRecord(reviewRecord);
        expect(chluIpfs.validator.validateMultihash.called).to.be.true;
        chluIpfs.validator.validateMultihash.resetHistory();
        reviewRecord.hash = 'this hash is wrong on purpose';
        let error;
        try {
            await chluIpfs.validator.validateReviewRecord(reviewRecord);
        } catch (err) {
            error = err;
        }
        expect(error.message.slice(0, 'Mismatching hash'.length)).to.equal('Mismatching hash');
        expect(chluIpfs.validator.validateMultihash.called).to.be.true;
    });

    it('validates ancestors', async () => {
        // Prepare data
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
        // Disable other validators
        chluIpfs.validator.validateVersion = sinon.stub().resolves();
        chluIpfs.validator.validateRRSignature = sinon.stub().resolves();
        chluIpfs.validator.validatePoPRSignaturesAndKeys = sinon.stub().resolves();
        chluIpfs.validator.validateMultihash = sinon.stub().resolves();
        // Spy
        sinon.spy(chluIpfs.validator, 'validatePrevious');
        // Test success case
        await chluIpfs.validator.validateReviewRecord(reviewRecord3);
        expect(chluIpfs.validator.validatePrevious.calledWith(reviewRecord3, reviewRecord2)).to.be.true;
        expect(chluIpfs.validator.validatePrevious.calledWith(reviewRecord2, reviewRecord)).to.be.true;
        expect(chluIpfs.validator.validatePrevious.callCount).to.equal(2);
        expect(chluIpfs.reviewRecords.getReviewRecord.calledWith(reviewRecord3.previous_version_multihash)).to.be.true;
        // Test failure cases
        chluIpfs.validator.validateMultihash.resetHistory();
        chluIpfs.validator.validatePrevious.resetHistory();
        chluIpfs.validator.validatePrevious.resetHistory();
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

    it('validates PoPR signatures and keys', async () => {
        // Disable other validators
        chluIpfs.validator.validateVersion = sinon.stub().resolves();
        chluIpfs.validator.validateRRSignature = sinon.stub().resolves();
        chluIpfs.validator.validateHistory = sinon.stub().resolves();
        chluIpfs.validator.validateMultihash = sinon.stub().resolves();
        // --- Setup
        const fakeStore = {};
        chluIpfs.ipfsUtils = ipfsUtilsStub(fakeStore);
        const { makeKeyPair, preparePoPR } = cryptoTestUtils(chluIpfs);
        const vm = await makeKeyPair();
        const v = await makeKeyPair();
        const m = await makeKeyPair();
        chluIpfs.validator.fetchMarketplaceKey = sinon.stub().resolves(m.multihash);
        // --- Success Case
        const popr = (await getFakeReviewRecord()).popr;
        const signedPoPR = await preparePoPR(popr, vm, v, m);
        let valid = await chluIpfs.validator.validatePoPRSignaturesAndKeys(cloneDeep(signedPoPR));
        expect(valid).to.be.true;
        // --- Failure Cases
        const test = popr => {
            return () => {
                chluIpfs.validator.validatePoPRSignaturesAndKeys(popr);
            };
        };
        let invalidPopr = cloneDeep(popr);
        invalidPopr.hash = 'lol not the real hash';
        expect(test(invalidPopr)).to.throw;
        invalidPopr = cloneDeep(popr);
        invalidPopr.signature = invalidPopr.vendor_signature;
        expect(test(invalidPopr)).to.throw;
        invalidPopr = cloneDeep(popr);
        invalidPopr.marketplace_signature = invalidPopr.vendor_signature;
        expect(test(invalidPopr)).to.throw;
        invalidPopr = cloneDeep(popr);
        invalidPopr.vendor_signature = invalidPopr.marketplace_signature;
        expect(test(invalidPopr)).to.throw;
    });

    it('validates Review Record signature', async () => {
        // Disable other validators
        chluIpfs.validator.validateVersion = sinon.stub().resolves();
        chluIpfs.validator.validatePoPRSignaturesAndKeys = sinon.stub().resolves();
        chluIpfs.validator.validateHistory = sinon.stub().resolves();
        chluIpfs.validator.validateMultihash = sinon.stub().resolves();
        // --- Setup
        const fakeStore = {};
        chluIpfs.ipfsUtils = ipfsUtilsStub(fakeStore);
        chluIpfs.crypto.generateKeyPair();
        // --- Success Case
        let reviewRecord = await getFakeReviewRecord();
        reviewRecord = await chluIpfs.crypto.signReviewRecord(reviewRecord, chluIpfs.crypto.keyPair);
        reviewRecord.key_location = '/ipfs/' + chluIpfs.crypto.pubKeyMultihash;
        let valid = await chluIpfs.validator.validateRRSignature(reviewRecord);
        expect(valid).to.be.true;
        // --- Failure Cases
        const test = rr => {
            return () => {
                chluIpfs.validator.validateRRSignature(rr);
            };
        };
        let invalidRR = cloneDeep(reviewRecord);
        invalidRR.hash = 'lol not the real hash';
        expect(test(invalidRR)).to.throw;
        invalidRR = cloneDeep(reviewRecord);
        invalidRR.key_location = 'wrong';
        expect(test(invalidRR)).to.throw;
        invalidRR = cloneDeep(reviewRecord);
        invalidRR.review_text = 'wrong again';
        expect(test(invalidRR)).to.throw;
        invalidRR = cloneDeep(reviewRecord);
        invalidRR.signature = 'wrong again';
        expect(test(invalidRR)).to.throw;
    });
});
