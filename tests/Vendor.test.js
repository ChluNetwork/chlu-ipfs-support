const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');
const { getFakeReviewRecord } = require('./utils/protobuf');
const { ECPair } = require('bitcoinjs-lib');

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
    });

    afterEach(() => {
        chluIpfs = null;
        map = null;
    });

    it('signs and verifies', async () => {
        const reviewRecord = await getFakeReviewRecord();
        await chluIpfs.vendor.signPoPR(reviewRecord.popr, keyPair);
        const verification = await chluIpfs.vendor.verifyPoPR(reviewRecord.popr, pubKeyMultihash);
        expect(verification).to.be.true;
        // Test failure case: change a field and validate again
        reviewRecord.popr.amount = 200;
        const verificationToFail = await chluIpfs.vendor.verifyPoPR(reviewRecord.popr, pubKeyMultihash);
        expect(verificationToFail).to.be.false;
    });
});