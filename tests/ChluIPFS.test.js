const expect = require('chai').expect;

const ChluIPFS = require('../src/ChluIPFS');

describe('ChluIPFS', () => {
    it('constructor', () => {
        let type = ChluIPFS.types.customer;
        let chluIpfs = new ChluIPFS({ type });
        expect(chluIpfs.type).to.equal(type);
        type = ChluIPFS.types.vendor;
        chluIpfs = new ChluIPFS({ type });
        expect(chluIpfs.type).to.equal(type);
        type = ChluIPFS.types.marketplace;
        chluIpfs = new ChluIPFS({ type });
        expect(chluIpfs.type).to.equal(type);
        type = 'anything else';
        expect(() => new ChluIPFS({ type })).to.throw();
    });

    it('exportData', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer });
        chluIpfs.db = {
            keystore: {
                exportPublicKey: () => 'examplePublicKey',
                exportPrivateKey: () => 'examplePrivateKey'
            }
        };
        const exported = await chluIpfs.exportData();
        expect(exported.customerDbKeys).to.deep.equal({
            pub: 'examplePublicKey',
            priv: 'examplePrivateKey'
        });
    });
});