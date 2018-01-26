const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const protons = require('protons');
const protobuf = protons(require('../src/utils/protobuf'));
const { getFakeReviewRecord } = require('./utils/protobuf');

describe('Customer APIs', () => {

    let chluIpfs, multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPQ'; // not the real multihash

    before(async () => {
        const put = sinon.stub().returns({ multihash });
        chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false });
        chluIpfs.db = { address: { toString: () => 'example' } };
        chluIpfs.ipfs = { object: { put } };
        // Mock broadcast: fake a response so that the call can complete
        const broadcast = sinon.stub().callsFake(message => {
            const obj = JSON.parse(message);
            expect(obj.type).to.equal(ChluIPFS.eventTypes.wroteReviewRecord);
            expect(obj.multihash).to.equal(multihash);
            setTimeout(() => {
                chluIpfs.events.emit(ChluIPFS.eventTypes.pinned + '_' + obj.multihash);
            }, 100);
        });
        chluIpfs.room = { broadcast };
    });

    afterEach(async() => {
        chluIpfs.ipfs.object.put.resetHistory();
        chluIpfs.room.broadcast.resetHistory();
    });

    it('storeReviewRecord handles a plain javascript object', async () => {
        const reviewRecord = await getFakeReviewRecord();
        const result = await chluIpfs.storeReviewRecord(reviewRecord);
        const actual = chluIpfs.ipfs.object.put.args[0][0];
        expect(result).to.equal(multihash);
        expect(chluIpfs.ipfs.object.put.called).to.be.true;
        expect(chluIpfs.room.broadcast.called).to.be.true;
        expect(Buffer.isBuffer(actual)).to.be.true;
    });

    it('storeReviewRecord handles buffer', async () => {
        const reviewRecord = await getFakeReviewRecord();
        const buffer = protobuf.ReviewRecord.encode(reviewRecord);
        await chluIpfs.storeReviewRecord(buffer);
        const actual = chluIpfs.ipfs.object.put.args[0][0];
        expect(buffer == actual).to.be.true; // check reference
    });

});