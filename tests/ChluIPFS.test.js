const expect = require('chai').expect;

const ChluIPFS = require('../src/ChluIPFS');
const IpfsApi = require('ipfs-api');
const ipfsUtils = require('./utils/ipfs');

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

    it.only('can use either js-ipfs or js-ipfs-api', async () => {
        let options = {
            type: ChluIPFS.types.customer,
            useIpfsApi: true
        };
        let chluIpfs = new ChluIPFS(options);
        chluIpfs.utils.createIPFSAPI = ipfsUtils.getDisposableGoIpfs;
        await chluIpfs.start();
        expect(chluIpfs.ipfs).to.be.instanceof(IpfsApi);
        await chluIpfs.stop();
    });
});