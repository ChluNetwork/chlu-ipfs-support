
const expect = require('chai').expect;
const sinon = require('sinon')

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');

describe('Vendor Module', () => {
    let chluIpfs, didId

    beforeEach(async () => {
        chluIpfs = new ChluIPFS({
            enablePersistence: false,
            cache: { enabled: false },
            logger: logger('Vendor')
        });
        chluIpfs.did.publish = sinon.stub().resolves()
        chluIpfs.did.signMultihash = sinon.stub().resolves({ signatureValue: 'test' })
        // TODO: test getInfo as well
        chluIpfs.vendor.getInfo = sinon.stub().resolves({ data: { network: 'experimental' } })
        await chluIpfs.did.start()
        didId = chluIpfs.did.didId
    });

    afterEach(() => {
        chluIpfs = null;
    });


    it('performs a full signup of the vendor to the marketplace', async () => {
        chluIpfs.vendor.getVendorData = sinon.stub().resolves({ data: {} })
        chluIpfs.vendor.signup = sinon.stub().resolves({
            data: { 
                vDidId: didId,
                vSignature: null,
                vmPubKeyMultihash: 'multihash'
            }
        })
        chluIpfs.vendor.sendSignature = sinon.stub().resolves()
        const url = 'http://localhost:12345'
        await chluIpfs.vendor.registerToMarketplace(url)
        expect(chluIpfs.vendor.getVendorData.calledWith(url, didId)).to.be.true
        expect(chluIpfs.vendor.signup.calledWith(url, didId)).to.be.true
        const signature = await chluIpfs.did.signMultihash.returnValues[0]
        expect(chluIpfs.vendor.sendSignature.calledWith(url, didId, signature)).to.be.true
    });

    it('submits the signature if the vendor is signed up but the sig is missing', async () => {
        chluIpfs.vendor.getVendorData = sinon.stub().resolves({ data: { vDidId: didId } })
        chluIpfs.vendor.signup = sinon.stub().resolves()
        chluIpfs.vendor.sendSignature = sinon.stub().resolves()
        const url = 'http://localhost:12345'
        await chluIpfs.vendor.registerToMarketplace(url)
        expect(chluIpfs.vendor.getVendorData.calledWith(url, didId)).to.be.true
        expect(chluIpfs.vendor.signup.called).to.be.false
        const signature = await chluIpfs.did.signMultihash.returnValues[0]
        expect(chluIpfs.vendor.sendSignature.calledWith(url, didId, signature)).to.be.true
    });

    it('does nothing if the vendor is already fully signed up', async () => {
        chluIpfs.vendor.getVendorData = sinon.stub().resolves({ data: { vDidId: didId, vSignature: 'test' } })
        chluIpfs.vendor.signup = sinon.stub().resolves()
        chluIpfs.vendor.sendSignature = sinon.stub().resolves()
        const url = 'http://localhost:12345'
        await chluIpfs.vendor.registerToMarketplace(url)
        expect(chluIpfs.vendor.getVendorData.calledWith(url, didId)).to.be.true
        expect(chluIpfs.vendor.signup.called).to.be.false
        expect(chluIpfs.vendor.sendSignature.called).to.be.false
    });
});