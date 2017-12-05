
// due to https://github.com/indutny/brorand/pull/5 brorand does not work in this env so we need to mock it
// this is used by OrbitDB to generate keys
jest.mock('brorand', () => {
    const crypto = require('crypto');
    return jest.fn(n => crypto.randomBytes(n));
});

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

    // This test times out. At the moment we skip tests involving running a real IPFS node
    test.skip('start and stop', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.marketplace });
        const start = await chluIpfs.start();
        expect(start).toBeTruthy();
        const stop = await chluIpfs.stop();
        expect(stop).toBeTruthy();
    });
    
    test('storeReviewRecord', async () => {
        const multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPQ';
        const put = jest.fn().mockReturnValue({ multihash });
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer });
        chluIpfs.ipfs = { object: { put } };
        const result = await chluIpfs.storeReviewRecord(Buffer.from('example'));
        expect(result).toEqual(multihash);
        expect(put).toBeCalled();
    });

    test('exportData', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer });
        chluIpfs.db = {
            keystore: {
                exportPublicKey: jest.fn(() => 'examplePublicKey'),
                exportPrivateKey: jest.fn(() => 'examplePrivateKey')
            }
        };
        const exported = await chluIpfs.exportData();
        expect(exported.customerDbKeys).toEqual({
            pub: 'examplePublicKey',
            priv: 'examplePrivateKey'
        });
    });
});