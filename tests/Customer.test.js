const ChluIPFS = require('../src/ChluIPFS');

describe('Customer APIs', () => {

    test('storeReviewRecord', async () => {
        const multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPQ';
        const put = jest.fn().mockReturnValue({ multihash });
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer });
        chluIpfs.ipfs = { object: { put } };
        // Mock broadcast: fake a response so that the call can complete
        const broadcast = jest.fn(message => {
            const obj = JSON.parse(message);
            expect(obj.type).toEqual(ChluIPFS.eventTypes.wroteReviewRecord);
            expect(obj.multihash).toEqual(multihash);
            setTimeout(() => {
                chluIpfs.events.emit(ChluIPFS.eventTypes.pinned + '_' + obj.multihash);
            }, 100);
        });
        chluIpfs.room = { broadcast };
        const result = await chluIpfs.storeReviewRecord(Buffer.from('example'));
        expect(result).toEqual(multihash);
        expect(put).toBeCalled();
        expect(broadcast).toBeCalled();
    });

});