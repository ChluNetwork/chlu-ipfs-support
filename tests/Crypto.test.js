const expect = require('chai').expect;

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');
const { getFakeReviewRecord } = require('./utils/protobuf');
const { isValidMultihash } = require('../src/utils/ipfs');
const ipfsUtilsStub = require('./utils/ipfsUtilsStub')

describe('Crypto Module', () => {
    let chluIpfs, keyPair, makeKeyPair, pubKeyMultihash

    beforeEach(async () => {
        chluIpfs = new ChluIPFS({
            type: ChluIPFS.types.vendor,
            enablePersistence: false,
            cache: { enabled: false },
            logger: logger('Vendor')
        });
        makeKeyPair = async () => (await chluIpfs.crypto.generateKeyPair(false)).keyPair
        const keys = await chluIpfs.crypto.generateKeyPair(false)
        keyPair = keys.keyPair
        const fakeStore = {}
        chluIpfs.ipfsUtils = ipfsUtilsStub(fakeStore)
        pubKeyMultihash = await chluIpfs.ipfsUtils.put(Buffer.from(keyPair.getPublic('hex'), 'hex'))
    });

    afterEach(() => {
        chluIpfs = null;
    });

    it('signs and verifies multihashes', async () => {
        const content = { text: 'hello world, this is an example object' }
        const multihash = await chluIpfs.ipfsUtils.putJSON(content)
        const signature = await chluIpfs.crypto.signMultihash(multihash, keyPair)
        const verification = await chluIpfs.crypto.verifyMultihash(pubKeyMultihash, multihash, signature)
        expect(verification).to.be.true;
        const otherContent = { text: 'hello world, this is a DIFFERENT example object' }
        const otherMultihash = await chluIpfs.ipfsUtils.putJSON(otherContent)
        const toFail = await chluIpfs.crypto.verifyMultihash(pubKeyMultihash, otherMultihash, signature)
        expect(toFail).to.be.false
    });

    it('signs PoPRs', async () => {
        async function verifyPoPR(popr, pubKeyMultihash) {
            const hashed = await chluIpfs.reviewRecords.hashPoPR(popr);
            return await chluIpfs.crypto.verifyMultihash(
                pubKeyMultihash,
                hashed.hash,
                hashed.signature
            );
        }
        const reviewRecord = await getFakeReviewRecord();
        reviewRecord.popr = await chluIpfs.crypto.signPoPR(reviewRecord.popr, keyPair);
        const verification = await verifyPoPR(reviewRecord.popr, pubKeyMultihash);
        expect(verification).to.be.true;
        // Test failure case: change a field and validate again
        reviewRecord.popr.amount = 200;
        const verificationToFail = await verifyPoPR(reviewRecord.popr, pubKeyMultihash);
        expect(verificationToFail).to.be.false;
    });

    it('retrieves public keys', async () => {
        const buf = await chluIpfs.crypto.getPublicKey(pubKeyMultihash);
        expect(buf).to.deep.equal(Buffer.from(keyPair.getPublic('hex'), 'hex'));
    });

    it('stores public keys', async () => {
        const keyPair = await makeKeyPair()
        const multihash = await chluIpfs.crypto.storePublicKey(keyPair.getPublic());
        expect(multihash).to.be.a('string');
        expect(isValidMultihash(multihash)).to.be.true;
    });

    it('generates keypair', async () => {
        const { keyPair, pubKeyMultihash } = await chluIpfs.crypto.generateKeyPair();
        expect(chluIpfs.ipfsUtils.put.calledWith(Buffer.from(keyPair.getPublic('hex'), 'hex'))).to.be.true;
        expect(typeof keyPair.getPublic === 'function').to.be.true;
        expect(isValidMultihash(pubKeyMultihash)).to.be.true;
    });

    it('imports keypair', async () => {
        const keyPair = await makeKeyPair()
        const { keyPair: importedKeyPair, pubKeyMultihash } = await chluIpfs.crypto.importKeyPair(keyPair.getSecret('hex'));
        expect(typeof importedKeyPair.getPublic === 'function').to.be.true;
        expect(chluIpfs.ipfsUtils.put.calledWith(Buffer.from(keyPair.getPublic('hex'), 'hex'))).to.be.true;
        expect(importedKeyPair.getSecret('hex')).to.equal(keyPair.getSecret('hex'));
        expect(isValidMultihash(pubKeyMultihash)).to.be.true;
    });

    it('exports keypair', async () => {
        const keyPair = await makeKeyPair()
        const exported = await chluIpfs.crypto.exportKeyPair(keyPair);
        expect(exported).to.equal(keyPair.getSecret('hex'));
    });
});