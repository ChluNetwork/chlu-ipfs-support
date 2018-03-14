
const expect = require('chai').expect;

const protons = require('protons');
const protobuf = protons(require('../src/utils/protobuf')); 
const { getFakeReviewRecord } = require('./utils/protobuf');

describe('Protobuf', () => {

    it('ReviewRecord returns the original data if encoded then decoded', async () => {
        const fakeReviewRecord = await getFakeReviewRecord();
        fakeReviewRecord.last_reviewrecord_multihash = 'test';
        fakeReviewRecord.previous_version_multihash = 'test2';
        const buffer = protobuf.ReviewRecord.encode(fakeReviewRecord);
        const decoded = protobuf.ReviewRecord.decode(buffer);
        expect(decoded).to.deep.equal(fakeReviewRecord);
    });
});