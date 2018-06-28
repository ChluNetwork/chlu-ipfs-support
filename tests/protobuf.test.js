
const expect = require('chai').expect;

const protons = require('protons');
const ChluProtobuf = require('../src/modules/protobuf')
const { getFakeReviewRecord } = require('./utils/protobuf');

describe('Protobuf', () => {
    let protobuf

    before(() => {
        protobuf = new ChluProtobuf()
    })

    it('ReviewRecord returns the original data if encoded then decoded', async () => {
        const fakeReviewRecord = await getFakeReviewRecord();
        fakeReviewRecord.previous_version_multihash = 'test';
        fakeReviewRecord.key_location = ''
        const buffer = protobuf.ReviewRecord.encode(fakeReviewRecord);
        const decoded = protobuf.ReviewRecord.decode(buffer);
        expect(decoded).to.deep.equal(fakeReviewRecord);
    });

    it('PoPR returns the original data if encoded then decoded', async () => {
        const fakeReviewRecord = await getFakeReviewRecord();
        const fakePoPR = fakeReviewRecord.popr
        fakePoPR.vendor_did = 'test'
        const buffer = protobuf.PoPR.encode(fakePoPR);
        const decoded = protobuf.PoPR.decode(buffer);
        expect(decoded).to.deep.equal(fakePoPR);
    });

    it('works with proto3', async () => {
        const source = `
            syntax = "proto3";

            message Msg {
                string content = 1;
                string from = 2;
            }
        `
        const p = protons(source)
        const msg = {
            from: 'user',
            content: 'my message'
        }
        expect(p.Msg.decode(p.Msg.encode(msg))).to.deep.equal(msg)
    })
});