const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');
const { getFakeReviewRecord } = require('./utils/protobuf');
const { cloneDeep } = require('lodash');
const cryptoTestUtils = require('./utils/crypto');
const http = require('./utils/http');
const ipfsUtilsStub = require('./utils/ipfsUtilsStub');
const protons = require('protons');
const protobuf = protons(require('../src/utils/protobuf'));
const IPFSUtils = require('../src/utils/ipfs');
const btcUtils = require('./utils/bitcoin');

describe('Validator Module', () => {
    let chluIpfs;

    beforeEach(async () => {
        chluIpfs = new ChluIPFS({
            type: ChluIPFS.types.service,
            enablePersistence: false,
            cache: { enabled: false },
            logger: logger('Customer')
        });
        sinon.spy(chluIpfs.cache, 'cacheValidity');
        sinon.spy(chluIpfs.cache, 'cacheMarketplaceDIDID');
        // mock DB call
        // so that when the validator checks the DB for the tx info it gets some data
        chluIpfs.orbitDb.db = {
            getReviewRecordMetadata: sinon.stub().returns({
                bitcoinTransactionHash: 'fake'
            })
        };
        chluIpfs.bitcoin.Blockcypher = btcUtils.BlockcypherMock;
        chluIpfs.did.publish = sinon.stub().resolves()
        await chluIpfs.bitcoin.start();
        await chluIpfs.did.start();
        // TODO: instead of disabling explicitly other validators in tests,
        // make a system to explicity enable only the validator that needs to be tested
    });

    it('performs all ReviewRecord validations', async () => {
        const reviewRecord = await getFakeReviewRecord();
        const buffer = protobuf.ReviewRecord.encode(reviewRecord);
        const dagNode = await chluIpfs.ipfsUtils.createDAGNode(buffer);
        const multihash = IPFSUtils.getDAGNodeMultihash(dagNode);
        reviewRecord.multihash = multihash;
        chluIpfs.bitcoin.api.returnMatchingTXForRR(reviewRecord);
        chluIpfs.validator.validateVersion = sinon.stub().resolves();
        chluIpfs.validator.validateRRSignature = sinon.stub().resolves();
        chluIpfs.validator.validatePoPRSignaturesAndKeys = sinon.stub().resolves();
        chluIpfs.validator.validateMultihash = sinon.stub().resolves();
        chluIpfs.validator.validateHistory = sinon.stub().resolves();
        chluIpfs.validator.validateBitcoinTransaction = sinon.stub().resolves();
        await chluIpfs.validator.validateReviewRecord(reviewRecord);
        expect(chluIpfs.validator.validateMultihash.called).to.be.true;
        expect(chluIpfs.validator.validateHistory.called).to.be.true;
        expect(chluIpfs.validator.validateVersion.called).to.be.true;
        expect(chluIpfs.validator.validatePoPRSignaturesAndKeys.called).to.be.true;
        expect(chluIpfs.validator.validateRRSignature.called).to.be.true;
        expect(chluIpfs.validator.validateBitcoinTransaction.called).to.be.true;
        // --- Cache behavior
        expect(chluIpfs.cache.cacheValidity.calledWith(multihash)).to.be.true;
        chluIpfs.cache.cacheValidity.resetHistory();
        expect(chluIpfs.cache.cacheValidity.called).to.be.false;
        await chluIpfs.validator.validateReviewRecord(reviewRecord, { useCache: false });
        expect(chluIpfs.cache.cacheValidity.calledWith(multihash)).to.be.false;
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
        chluIpfs.validator.validateBitcoinTransaction = sinon.stub().resolves();
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
        reviewRecord.multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP1';
        const reviewRecord2 = await getFakeReviewRecord();
        reviewRecord2.rating = 2;
        reviewRecord2.previous_version_multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP1';
        reviewRecord2.multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP2';
        const reviewRecord3 = await getFakeReviewRecord();
        reviewRecord3.rating = 3;
        reviewRecord3.previous_version_multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP2';
        reviewRecord3.multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP3';
        let map = {
            'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP1': reviewRecord,
            'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP2': reviewRecord2
        };
        chluIpfs.bitcoin.api.returnMatchingTXForRR(reviewRecord);
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
        // check that the db metadata (for the tx info) has been checked only for the original review
        expect(chluIpfs.orbitDb.db.getReviewRecordMetadata.calledWith(reviewRecord.multihash)).to.be.true;
        expect(chluIpfs.orbitDb.db.getReviewRecordMetadata.callCount).to.equal(1);
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
        expect(error.message).to.match(/^customer_address has changed/);
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
        const { makeKeyPair, makeDID, preparePoPR, buildDIDMap } = cryptoTestUtils(chluIpfs);
        const vm = await makeKeyPair();
        const v = await makeDID();
        const m = await makeDID();
        const didMap = buildDIDMap([v, m])
        chluIpfs.did.getDID = sinon.stub().callsFake(async id => didMap[id])
        chluIpfs.http = http(() => ({ didId: m.publicDidDocument.id }));
        // --- Success Case
        const popr = (await getFakeReviewRecord()).popr;
        const signedPoPR = await preparePoPR(popr, vm, v, m);
        let valid = await chluIpfs.validator.validatePoPRSignaturesAndKeys(cloneDeep(signedPoPR));
        expect(valid).to.be.true;
        // --- Cache behavior
        const hashed = await chluIpfs.reviewRecords.hashPoPR(cloneDeep(signedPoPR));
        expect(chluIpfs.cache.cacheValidity.calledWith(hashed.hash)).to.be.true;
        chluIpfs.cache.cacheValidity.resetHistory();
        expect(chluIpfs.cache.cacheValidity.called).to.be.false;
        await chluIpfs.validator.validatePoPRSignaturesAndKeys(cloneDeep(signedPoPR), null, false);
        expect(chluIpfs.cache.cacheValidity.calledWith(hashed.hash)).to.be.false;
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
        reviewRecord = await chluIpfs.did.signReviewRecord(reviewRecord);
        reviewRecord.key_location = chluIpfs.did.didId;
        chluIpfs.did.getDID = sinon.stub().resolves(chluIpfs.did.publicDidDocument)
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

    it('validates bitcoin transactions', async () => {
        await chluIpfs.bitcoin.start();
        const reviewRecord = await getFakeReviewRecord();
        // put correct tx data in place
        reviewRecord.multihash = 'Qmdc9UyE2fogSGbuquB47q7wBGR4zQjnhQPNn8ZTNrQ3YS';
        reviewRecord.amount = 309696;
        reviewRecord.vendor_address = 'ms4TpM57RWHnEq5PRFtfJ8bcdiXoUE3tfv';
        reviewRecord.customer_address = 'mjw2BcBvNKkgLvQyYhzRERRgWSUVG7HHTb';
        const txId = btcUtils.exampleTransaction.hash.slice(0);
        // success case
        await chluIpfs.validator.validateBitcoinTransaction(reviewRecord, txId, false);
        // failure cases
        let error, wrongReviewRecord;
        // check multihash
        wrongReviewRecord = Object.assign({}, reviewRecord, {
            multihash: '1 2 3'
        });
        error = undefined;
        try {
            await chluIpfs.validator.validateBitcoinTransaction(wrongReviewRecord, txId, false);
        } catch (err) {
            error = err;
        }
        expect(error.message).to.equal('Mismatching transaction multihash');
        // Check amount
        wrongReviewRecord = Object.assign({}, reviewRecord, {
            amount: 1234
        });
        error = undefined;
        try {
            await chluIpfs.validator.validateBitcoinTransaction(wrongReviewRecord, txId, false);
        } catch (err) {
            error = err;
        }
        expect(error.message).to.equal('Review Record amount is not matching transaction amount');
        // Check vendor address
        wrongReviewRecord = Object.assign({}, reviewRecord, {
            vendor_address: 'abc'
        });
        error = undefined;
        try {
            await chluIpfs.validator.validateBitcoinTransaction(wrongReviewRecord, txId, false);
        } catch (err) {
            error = err;
        }
        expect(error.message).to.equal('The Vendor address in the Review Record is different than the address the funds were sent to');
        // Check customer address
        wrongReviewRecord = Object.assign({}, reviewRecord, {
            customer_address: 'abc'
        });
        error = undefined;
        try {
            await chluIpfs.validator.validateBitcoinTransaction(wrongReviewRecord, txId, false);
        } catch (err) {
            error = err;
        }
        expect(error.message).to.equal('The Customer address in the Review Record is different than the address the funds were sent from');
    });
});
