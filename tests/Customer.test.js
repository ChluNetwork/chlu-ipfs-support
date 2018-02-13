const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const protons = require('protons');
const protobuf = protons(require('../src/utils/protobuf'));
const { getFakeReviewRecord } = require('./utils/protobuf');
const logger = require('./utils/logger')

describe('Customer', () => {

    let chluIpfs, multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPQ'; // not the real multihash

    before(async () => {
        chluIpfs = new ChluIPFS({
            type: ChluIPFS.types.customer,
            enablePersistence: false,
            logger: logger('Customer')
        });
        chluIpfs.orbitDb.db = { address: { toString: () => 'example' } };
        chluIpfs.ipfsUtils = {
            createDAGNode: sinon.stub().resolves({ multihash }),
            storeDAGNode: sinon.stub().resolves(multihash),
            getDAGNodeMultihash: sinon.stub().returns(multihash)
        };
        // Mock broadcast: fake a response so that the call can complete
        const broadcast = sinon.stub().callsFake(msg => {
            const obj = JSON.parse(msg.toString());
            expect(obj.type).to.equal(ChluIPFS.eventTypes.wroteReviewRecord);
            expect(obj.multihash).to.equal(multihash);
            setTimeout(() => {
                chluIpfs.events.emit(ChluIPFS.eventTypes.pinned + '_' + obj.multihash);
            }, 0);
        });
        const getPeers = sinon.stub().returns(1);
        chluIpfs.room.room = {
            broadcast,
            on: sinon.stub(),
            removeListener: sinon.stub(),
            getPeers
        };
    });

    afterEach(async() => {
        chluIpfs.ipfsUtils.createDAGNode.resetHistory();
        chluIpfs.ipfsUtils.storeDAGNode.resetHistory();
        chluIpfs.ipfsUtils.getDAGNodeMultihash.resetHistory();
        chluIpfs.room.room.broadcast.resetHistory();
    });

    it('stores ReviewRecords and automatically publishes them', async () => {
        const reviewRecord = await getFakeReviewRecord();
        const result = await chluIpfs.storeReviewRecord(reviewRecord);
        const actual = chluIpfs.ipfsUtils.createDAGNode.args[0][0];
        expect(result).to.equal(multihash);
        expect(chluIpfs.room.room.broadcast.called).to.be.true;
        expect(chluIpfs.ipfsUtils.storeDAGNode.called).to.be.true;
        expect(protobuf.ReviewRecord.decode(actual).chlu_version).to.not.be.undefined;
    });

    it('can store ReviewRecords without publishing', async () => {
        const reviewRecord = await getFakeReviewRecord();
        const result = await chluIpfs.storeReviewRecord(reviewRecord, { publish: false });
        const actual = chluIpfs.ipfsUtils.createDAGNode.args[0][0];
        expect(result).to.equal(multihash);
        expect(chluIpfs.room.room.broadcast.called).to.be.false;
        expect(chluIpfs.ipfsUtils.storeDAGNode.called).to.be.false;
        expect(protobuf.ReviewRecord.decode(actual).chlu_version).to.not.be.undefined;
    });

    it('can store ReviewRecords without publishing then store them again and publish them', async () => {
        const reviewRecord = await getFakeReviewRecord();
        const result = await chluIpfs.storeReviewRecord(reviewRecord, { publish: false });
        let actual = chluIpfs.ipfsUtils.createDAGNode.args[0][0];
        expect(result).to.equal(multihash);
        expect(chluIpfs.room.room.broadcast.called).to.be.false;
        expect(protobuf.ReviewRecord.decode(actual).chlu_version).to.not.be.undefined;
        const newResult = await chluIpfs.storeReviewRecord(reviewRecord, { expectedMultihash: result });
        expect(chluIpfs.room.room.broadcast.called).to.be.true;
        expect(newResult).to.equal(result);
        actual = chluIpfs.ipfsUtils.createDAGNode.args[1][0];
        expect(protobuf.ReviewRecord.decode(actual).chlu_version).to.not.be.undefined;
    });

    it('correctly checks expected multihash when storing a review record', async () => {
        const reviewRecord = await getFakeReviewRecord();
        let errorMessage;
        try {
            await chluIpfs.storeReviewRecord(reviewRecord, { publish: false, expectedMultihash: 'test' });
        } catch (error) {
            errorMessage = error.message;
        }
        expect(errorMessage).to.equal('Expected a different multihash');
        errorMessage = null;
        try {
            await chluIpfs.storeReviewRecord(reviewRecord, { publish: false, expectedMultihash: multihash });
        } catch (error) {
            errorMessage = error.message;
        }
        expect(errorMessage).to.be.null;
    });

});