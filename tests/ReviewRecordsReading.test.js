const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');

const { getFakeReviewRecord, makeUnverified } = require('./utils/protobuf');
const multihashes = require('multihashes');
const { isValidMultihash } = require('../src/utils/ipfs');
const ipfsUtilsStub = require('./utils/ipfsUtilsStub');

describe('ReviewRecord reading and other functions', () => {
    let chluIpfs;

    beforeEach(async () => {
        chluIpfs = new ChluIPFS({
            enablePersistence: false,
            cache: { enabled: false },
            logger: logger('Customer')
        });
        chluIpfs.waitUntilReady = sinon.stub().resolves();
        chluIpfs.didIpfsHelper.publish = sinon.stub().resolves()
        await chluIpfs.didIpfsHelper.start() // generate a DID
    });

    it('reads Verified Review from IPFS (no validation)', async () => {
        const fakeReviewRecord = await getFakeReviewRecord();
        const multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPQ'; // not the real multihash
        const multihashBuffer = multihashes.fromB58String(multihash);
        const buffer = chluIpfs.protobuf.ReviewRecord.encode(fakeReviewRecord);
        const ipfs = {
            object: {
                get: sinon.stub().resolves({ data: buffer })
            }
        };
        chluIpfs.ipfs = ipfs;
        const reviewRecord = await chluIpfs.readReviewRecord(multihash, { validate: false });
        expect(ipfs.object.get.args[0][0]).to.deep.equal(multihashBuffer);
        expect(reviewRecord).to.not.be.undefined;
        expect(reviewRecord.chlu_version).to.not.be.undefined;
    });

    it('reads Unverified Reviews from IPFS (no validation)', async () => {
        const fakeReviewRecord = makeUnverified(await getFakeReviewRecord())
        const multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPQ'; // not the real multihash
        const multihashBuffer = multihashes.fromB58String(multihash);
        const buffer = chluIpfs.protobuf.ReviewRecord.encode(fakeReviewRecord);
        const ipfs = {
            object: {
                get: sinon.stub().resolves({ data: buffer })
            }
        };
        chluIpfs.ipfs = ipfs;
        const reviewRecord = await chluIpfs.readReviewRecord(multihash, { validate: false });
        expect(ipfs.object.get.args[0][0]).to.deep.equal(multihashBuffer);
        expect(reviewRecord).to.not.be.undefined;
        expect(reviewRecord.chlu_version).to.not.be.undefined;
    })

    it('correctly checks if review is editable', async () => {
        const multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPQ'; // not the real multihash
        function putReview(reviewRecord) {
            const buffer = chluIpfs.protobuf.ReviewRecord.encode(reviewRecord);
            const ipfs = {
                object: {
                    get: sinon.stub().resolves({ data: buffer })
                }
            };
            chluIpfs.ipfs = ipfs;
        }
        // unverified review
        let review = makeUnverified(await getFakeReviewRecord())
        review.issuer = chluIpfs.didIpfsHelper.didId
        putReview(review)
        let reviewRecord = await chluIpfs.readReviewRecord(multihash, { validate: false });
        expect(reviewRecord.editable).to.be.false;
        // verified review
        review = await getFakeReviewRecord()
        review.issuer = chluIpfs.didIpfsHelper.didId
        putReview(review)
        reviewRecord = await chluIpfs.readReviewRecord(multihash, { validate: false });
        expect(reviewRecord.editable).to.be.true
        // verified review, different issuer
        review = await getFakeReviewRecord()
        review.issuer = 'did:chlu:rando'
        putReview(review)
        reviewRecord = await chluIpfs.readReviewRecord(multihash, { validate: false });
        expect(reviewRecord.editable).to.be.false
    })

    it('recognizes valid and invalid multihashes', async () => {
        let multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPQ';
        expect(isValidMultihash(multihash)).to.be.true;
        expect(isValidMultihash(multihashes.fromB58String(multihash))).to.be.true;
        expect(isValidMultihash('blah')).to.be.false;
        expect(isValidMultihash({ notEvenA: 'multihash'})).to.be.false;
    });

    it('sets the last review record multihash into new reviews and updates it after storing the review', async () => {
        const fakeReviewRecord = await getFakeReviewRecord();
        const lastReviewRecordMultihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPZ';
        chluIpfs.lastReviewRecordMultihash = lastReviewRecordMultihash.slice(0); // make a copy
        const fakeStore = {};
        chluIpfs.ipfsUtils = ipfsUtilsStub(fakeStore);
        chluIpfs.orbitDb.putReviewRecordAndWaitForReplication = sinon.stub().resolves();
        chluIpfs.reviewRecords.waitForRemotePin = sinon.stub().resolves();
        chluIpfs.crypto.generateKeyPair();
        const multihash = await chluIpfs.storeReviewRecord(fakeReviewRecord, {
            validate: false,
            bitcoinTransactionHash: 'fake'
        });
        const reviewRecord = chluIpfs.protobuf.ReviewRecord.decode(chluIpfs.ipfsUtils.storeDAGNode.args[0][0].data);
        expect(reviewRecord.last_reviewrecord_multihash).to.deep.equal(lastReviewRecordMultihash);
        expect(chluIpfs.lastReviewRecordMultihash).to.deep.equal(multihash);
    });
    
    it('computes the ReviewRecord hash', async () => {
        const reviewRecord = await getFakeReviewRecord();
        reviewRecord.hash = 'fake';
        const hashedReviewRecord = await chluIpfs.reviewRecords.hashReviewRecord(reviewRecord);
        expect(hashedReviewRecord.hash).not.to.equal(reviewRecord.hash);
        const hashedAgain = await chluIpfs.reviewRecords.hashReviewRecord(reviewRecord);
        expect(hashedAgain.hash).to.equal(hashedReviewRecord.hash);
        multihashes.validate(multihashes.fromB58String(hashedReviewRecord.hash)); // throws if invalid
    });

    it('can rebuild the history of an updated ReviewRecord', async () => {
        const reviewRecord = await getFakeReviewRecord();
        const reviewRecord2 = await getFakeReviewRecord();
        reviewRecord2.previous_version_multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP1';
        const reviewRecord3 = await getFakeReviewRecord();
        reviewRecord3.previous_version_multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP2';
        let map = {
            'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP1': reviewRecord,
            'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP2': reviewRecord2
        };
        chluIpfs.reviewRecords.getReviewRecord = sinon.stub().callsFake(async multihash => {
            return map[multihash];
        });
        const history = await chluIpfs.reviewRecords.getHistory(reviewRecord3);
        expect(history.map(o => o.multihash)).to.deep.equal(Object.keys(map).reverse());
        expect(history.map(o => o.reviewRecord)).to.deep.equal(Object.values(map).reverse());
        // Check that the recursive history detection works
        map = {
            'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP1': reviewRecord,
            'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP2': reviewRecord2,
            'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP3': reviewRecord3
        };
        reviewRecord.previous_version_multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVP3';
        chluIpfs.reviewRecords.getReviewRecord = sinon.stub().callsFake(async multihash => {
            return map[multihash];
        });
        let error;
        try {
            await chluIpfs.reviewRecords.getHistory(reviewRecord3);
        } catch (err) {
            error = err;
        }
        expect(error).to.not.be.undefined;
    });

});