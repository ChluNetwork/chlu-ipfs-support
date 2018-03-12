const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const protons = require('protons');
const protobuf = protons(require('../src/utils/protobuf'));
const logger = require('./utils/logger');
const { getFakeReviewRecord } = require('./utils/protobuf');
const DAGNode = require('ipld-dag-pb').DAGNode;
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
        // --- Setup
        const fakeStore = {};
        chluIpfs.ipfsUtils = {
            get: sinon.stub().callsFake(async m => fakeStore[m]),
            put: sinon.stub().callsFake(async data => {
                const buf = Buffer.from(data);
                const multihash = await new Promise((resolve, reject) => {
                    DAGNode.create(buf, [], (err, dagNode) => {
                        if (err) reject(err); else resolve(dagNode.toJSON().multihash);
                    });
                });
                fakeStore[multihash] = buf;
                return multihash;
            }),
            storeDAGNode: sinon.stub().callsFake(async dagNode => {
                const data = dagNode.toJSON();
                fakeStore[data.multihash] = data.data;
                return data.multihash;
            })
        };
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
});
