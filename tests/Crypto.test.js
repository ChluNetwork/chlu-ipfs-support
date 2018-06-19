const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');
const { getFakeReviewRecord } = require('./utils/protobuf');
const { ECPair } = require('bitcoinjs-lib');
const DAGNode = require('ipld-dag-pb').DAGNode;
const { isValidMultihash } = require('../src/utils/ipfs');

describe('Crypto Module', () => {
    let chluIpfs, keyPair, map, pubKeyMultihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP1';

    before(() => {
        keyPair = ECPair.makeRandom();
    });

    beforeEach(() => {
        chluIpfs = new ChluIPFS({
            type: ChluIPFS.types.vendor,
            enablePersistence: false,
            cache: { enabled: false },
            logger: logger('Vendor')
        });
        map = {
            [pubKeyMultihash]: keyPair.getPublicKeyBuffer()
        };
        chluIpfs.ipfsUtils.get = sinon.stub().callsFake(async multihash => {
            return map[multihash];
        });
        chluIpfs.ipfsUtils.put = sinon.stub().callsFake(async data => {
            const buf = Buffer.from(data);
            const multihash = await new Promise((resolve, reject) => {
                DAGNode.create(buf, [], (err, dagNode) => {
                    if (err) reject(err); else resolve(dagNode.toJSON().multihash);
                });
            });
            map[multihash] = buf;
            return multihash;
        });
    });

    afterEach(() => {
        chluIpfs = null;
        map = null;
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
        expect(buf).to.deep.equal(keyPair.getPublicKeyBuffer());
    });

    it('stores public keys', async () => {
        const keyPair = ECPair.makeRandom();
        const multihash = await chluIpfs.crypto.storePublicKey(keyPair.getPublicKeyBuffer());
        expect(multihash).to.be.a('string');
        expect(isValidMultihash(multihash)).to.be.true;
    });

    it('generates keypair', async () => {
        const { keyPair, pubKeyMultihash } = await chluIpfs.crypto.generateKeyPair();
        expect(chluIpfs.ipfsUtils.put.calledWith(keyPair.getPublicKeyBuffer())).to.be.true;
        expect(keyPair instanceof ECPair).to.be.true;
        expect(isValidMultihash(pubKeyMultihash)).to.be.true;
    });

    it('imports keypair', async () => {
        const keyPair = ECPair.makeRandom();
        const { keyPair: importedKeyPair, pubKeyMultihash } = await chluIpfs.crypto.importKeyPair(keyPair.toWIF());
        expect(importedKeyPair instanceof ECPair).to.be.true;
        expect(chluIpfs.ipfsUtils.put.calledWith(keyPair.getPublicKeyBuffer())).to.be.true;
        expect(importedKeyPair.toWIF()).to.equal(keyPair.toWIF());
        expect(isValidMultihash(pubKeyMultihash)).to.be.true;
    });

    it('exports keypair', async () => {
        const keyPair = ECPair.makeRandom();
        const exported = await chluIpfs.crypto.exportKeyPair(keyPair);
        expect(exported).to.equal(keyPair.toWIF());
    });
});