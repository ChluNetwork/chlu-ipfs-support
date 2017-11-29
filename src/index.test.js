const ChluIPFS = require('./index');

describe('ChluIPFS', () => {
    test('constructor', () => {
        let type = ChluIPFS.types.customer;
        let chluIpfs = new ChluIPFS({ type });
        expect(chluIpfs.type).toBe(type);
        type = ChluIPFS.types.vendor;
        chluIpfs = new ChluIPFS({ type });
        expect(chluIpfs.type).toBe(type);
        type = ChluIPFS.types.marketplace;
        chluIpfs = new ChluIPFS({ type });
        expect(chluIpfs.type).toBe(type);
        type = 'anything else';
        expect(() => new ChluIPFS({ type })).toThrow();
    });

    test('start and stop', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer });
        const start = await chluIpfs.start();
        expect(start).toBeTruthy();
        const stop = await chluIpfs.stop();
        expect(stop).toBeTruthy();
    });
    
    test('storeReviewRecord', async () => {
        const multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPQ';
        const put = jest.fn().mockReturnValue({ multihash });
        const chluIpfs = new ChluIPFS({
            type: ChluIPFS.types.customer,
            ipfsModule: {
                object: {
                    put
                }
            }
        });
        const result = await chluIpfs.storeReviewRecord(Buffer.from('example'));
        expect(result).toEqual(multihash);
        expect(put).toBeCalled();
    });
});