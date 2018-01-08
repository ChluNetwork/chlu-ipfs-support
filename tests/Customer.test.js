const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');

describe('Customer APIs', () => {

    it('storeReviewRecord', async () => {
        const multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPQ';
        const put = sinon.stub().returns({ multihash });
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false });
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
        const result = await chluIpfs.storeReviewRecord(Buffer.from('example'));
        expect(result).to.equal(multihash);
        expect(put.called).to.be.true;
        expect(broadcast.called).to.be.true;
    });

});