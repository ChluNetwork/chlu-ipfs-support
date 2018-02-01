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

});