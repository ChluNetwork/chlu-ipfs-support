const chai = require('chai');
const expect = chai.expect;

const ChluIPFS = require('../src/ChluIPFS.mock');

describe('ChluIPFS Mock API', () => {

    it('fake constructor', () => {
        let type = ChluIPFS.types.customer;
        new ChluIPFS({ type });
        type = ChluIPFS.types.vendor;
        new ChluIPFS({ type });
        type = ChluIPFS.types.marketplace;
        new ChluIPFS({ type });
        type = 'anything else';
        expect(() => new ChluIPFS({ type })).to.throw();
    });

    it('fake start', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.marketplace, fakeWait: false });
        const start = await chluIpfs.start();
        expect(start).to.be.true;
    });

    it('fake stop', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.marketplace, fakeWait: false });
        const stop = await chluIpfs.stop();
        expect(stop).to.be.true;
    });

    it('fake switchType', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.marketplace, fakeWait: false });
        await chluIpfs.switchType(ChluIPFS.types.customer);
        expect(chluIpfs.type).to.equal(ChluIPFS.types.customer);
    });

    it('fake exportData', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, fakeWait: false });
        const exported = await chluIpfs.exportData();
        expect(exported.customerDbKeys).to.deep.equal({
            pub: 'examplePublicKey',
            priv: 'examplePrivateKey'
        });
    });
    
    it('fake storeReviewRecord', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, fakeWait: false });
        const result = await chluIpfs.storeReviewRecord();
        expect(result).to.not.be.undefined;
    });
    
    it('fake readReviewRecord', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, fakeWait: false });
        const result = await chluIpfs.readReviewRecord();
        expect(result).to.not.be.undefined;
    });
    
    it('fake importData', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, fakeWait: false });
        const result = await chluIpfs.importData();
        expect(result).to.be.undefined;
    });
    
    it('fake getVendorKeys', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, fakeWait: false });
        const keys = await chluIpfs.getVendorKeys('fakeipnsname');
        expect(keys).to.deep.equal({ pubenc: 'mockedpubenckey', pubsig: 'mockedpubsigkey' });
    });
    
    it('fake publishKeys', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, fakeWait: false });
        const result = await chluIpfs.publishKeys();
        expect(result).to.equal('fakekeysmultihash');
    });
});