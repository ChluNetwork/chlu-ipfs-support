const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');
const protons = require('protons');
const protobuf = protons(require('../src/utils/protobuf'));
const { getFakeReviewRecord } = require('./utils/protobuf');
const multihashes = require('multihashes');
const { isValidMultihash } = require('../src/utils/ipfs');

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

    it('starts and stops', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.service, enablePersistence: false, logger: logger('Service') });
        await chluIpfs.start();
        expect(chluIpfs.ipfs).to.not.be.undefined;
        await chluIpfs.stop();
        expect(chluIpfs.ipfs).to.be.undefined;
    });

    it('switches type correctly from service node', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.service, enablePersistence: false, logger: logger('Service') });
        const fakeDb = {
            close: sinon.stub().resolves()
        };
        chluIpfs.dbs = {
            first: fakeDb
        };
        chluIpfs.room = {
            removeListener: sinon.stub()
        };
        chluIpfs.serviceNodeRoomMessageListener = 'test';
        expect(chluIpfs.type).to.equal(ChluIPFS.types.service);
        await chluIpfs.switchType(ChluIPFS.types.customer);
        expect(chluIpfs.type).to.equal(ChluIPFS.types.customer);
        expect(chluIpfs.dbs).to.deep.equal({});
        expect(fakeDb.close.called).to.be.true;
        expect(chluIpfs.room.removeListener.calledWith('message', chluIpfs.serviceNodeRoomMessageListener));
    });

    it('switches type correctly from customer', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false, logger: logger('Customer') });
        const fakeDb = {
            close: sinon.stub().resolves()
        };
        chluIpfs.db = fakeDb;
        expect(chluIpfs.type).to.equal(ChluIPFS.types.customer);
        await chluIpfs.switchType(ChluIPFS.types.vendor);
        expect(chluIpfs.type).to.equal(ChluIPFS.types.vendor);
        expect(chluIpfs.db).to.be.undefined;
        expect(fakeDb.close.called).to.be.true;
    });

    it('reads ReviewRecords from IPFS', async () => {
        const fakeReviewRecord = await getFakeReviewRecord();
        const multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPQ'; // not the real multihash
        const multihashBuffer = multihashes.fromB58String(multihash);
        const buffer = protobuf.ReviewRecord.encode(fakeReviewRecord);
        const ipfs = {
            object: {
                get: sinon.stub().resolves({ Data: buffer })
            }
        };
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false, logger: logger('Customer') });
        chluIpfs.ipfs = ipfs;
        const reviewRecord = await chluIpfs.readReviewRecord(multihash);
        expect(ipfs.object.get.args[0][0]).to.deep.equal(multihashBuffer);
        expect(reviewRecord).to.not.be.undefined;
        expect(reviewRecord.chlu_version).to.not.be.undefined;
    });

    it('recognizes valid and invalid multihashes', async () => {
        let multihash = 'QmQ6vGTgqjec2thBj5skqfPUZcsSuPAbPS7XvkqaYNQVPQ';
        expect(isValidMultihash(multihash)).to.be.true;
        expect(isValidMultihash(multihashes.fromB58String(multihash))).to.be.true;
        expect(isValidMultihash('blah')).to.be.false;
        expect(isValidMultihash({ notEvenA: 'multihash'})).to.be.false;
    });
});