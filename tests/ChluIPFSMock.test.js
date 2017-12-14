const ChluIPFS = require('../src/ChluIPFS.mock');

// Mock timing module so that the tests don't have to wait
jest.mock('../src/utils/timing', () => {
    return {
        milliseconds: jest.fn(() => new Promise(fullfill => fullfill()))
    };
});
const timing = require('../src/utils/timing');

describe('ChluIPFS Mock API', () => {
    beforeEach(() => {
        timing.milliseconds.mockClear();
    });

    test('fake constructor', () => {
        let type = ChluIPFS.types.customer;
        new ChluIPFS({ type });
        type = ChluIPFS.types.vendor;
        new ChluIPFS({ type });
        type = ChluIPFS.types.marketplace;
        new ChluIPFS({ type });
        type = 'anything else';
        expect(() => new ChluIPFS({ type })).toThrow();
    });

    test('fake start', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.marketplace });
        const start = await chluIpfs.start();
        expect(timing.milliseconds).toHaveBeenCalled();
        expect(start).toBeTruthy();
    });

    test('fake stop', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.marketplace });
        const stop = await chluIpfs.stop();
        expect(timing.milliseconds).toHaveBeenCalled();
        expect(stop).toBeTruthy();
    });

    test('fake exportData', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer });
        const exported = await chluIpfs.exportData();
        expect(timing.milliseconds).toHaveBeenCalled();
        expect(exported.customerDbKeys).toEqual({
            pub: 'examplePublicKey',
            priv: 'examplePrivateKey'
        });
    });
    
    test('fake importData', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer });
        const result = await chluIpfs.importData();
        expect(timing.milliseconds).toHaveBeenCalled();
        expect(result).toBeUndefined();
    });
    
    test('fake getVendorKeys', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer });
        const keys = await chluIpfs.getVendorKeys('fakeipnsname');
        expect(timing.milliseconds).toHaveBeenCalled();
        expect(keys).toEqual({ pubenc: 'mockedpubenckey', pubsig: 'mockedpubsigkey' });
    });
    
    test('fake publishKeys', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer });
        const result = await chluIpfs.publishKeys();
        expect(timing.milliseconds).toHaveBeenCalled();
        expect(result).toEqual('fakekeysmultihash');
    });
    
    test('fake publishUpdatedReviews', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer });
        const result = await chluIpfs.publishUpdatedReview();
        expect(timing.milliseconds).toHaveBeenCalled();
        expect(result).toBeUndefined();
    });
});