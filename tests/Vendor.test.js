const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');
const { getFakeReviewRecord } = require('./utils/protobuf');
const { ECPair } = require('bitcoinjs-lib');
const DAGNode = require('ipld-dag-pb').DAGNode;
const { isValidMultihash } = require('../src/utils/ipfs');

describe('Vendor Module', () => {
    let chluIpfs, keyPair, map, pubKeyMultihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP1';

    before(() => {
        keyPair = ECPair.makeRandom();
    });

    beforeEach(() => {
        chluIpfs = new ChluIPFS({
            type: ChluIPFS.types.vendor,
            enablePersistence: false,
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

    it('signs and verifies PoPRs', async () => {
        const reviewRecord = await getFakeReviewRecord();
        await chluIpfs.vendor.signPoPR(reviewRecord.popr, keyPair);
        const verification = await chluIpfs.vendor.verifyPoPR(reviewRecord.popr, pubKeyMultihash);
        expect(verification).to.be.true;
        // Test failure case: change a field and validate again
        reviewRecord.popr.amount = 200;
        const verificationToFail = await chluIpfs.vendor.verifyPoPR(reviewRecord.popr, pubKeyMultihash);
        expect(verificationToFail).to.be.false;
    });

    it('retrieves public keys', async () => {
        const buf = await chluIpfs.vendor.getPublicKey(pubKeyMultihash);
        expect(buf).to.deep.equal(keyPair.getPublicKeyBuffer());
    });

    it('stores public keys', async () => {
        const keyPair = ECPair.makeRandom();
        const multihash = await chluIpfs.vendor.storePublicKey(keyPair.getPublicKeyBuffer());
        expect(multihash).to.be.a('string');
        expect(isValidMultihash(multihash)).to.be.true;
    });
});