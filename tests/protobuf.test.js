
const expect = require('chai').expect;

const protons = require('protons');
const protobuf = protons(require('../src/utils/protobuf')); 
const { getFakeReviewRecord } = require('./utils/protobuf');

describe('Protobuf', () => {

    it('ReviewRecord returns the original data if encoded then decoded', async () => {
        const fakeReviewRecord = await getFakeReviewRecord();
        fakeReviewRecord.last_reviewrecord_multihash = 'test';
        fakeReviewRecord.previous_version_multihash = 'test2';
        fakeReviewRecord.customer_did_id = 'test'
        fakeReviewRecord.popr.vendor_did_id = 'test'
        const buffer = protobuf.ReviewRecord.encode(fakeReviewRecord);
        const decoded = protobuf.ReviewRecord.decode(buffer);
        expect(decoded).to.deep.equal(fakeReviewRecord);
    });

    it('PoPR returns the original data if encoded then decoded', async () => {
        const fakeReviewRecord = await getFakeReviewRecord();
        const fakePoPR = fakeReviewRecord.popr
        fakePoPR.vendor_did_id = 'test'
        const buffer = protobuf.PoPR.encode(fakePoPR);
        const decoded = protobuf.PoPR.decode(buffer);
        expect(decoded).to.deep.equal(fakePoPR);
    });
});