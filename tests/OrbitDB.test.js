const expect = require('chai').expect;
const logger = require('./utils/logger');

const ChluIPFS = require('../src/ChluIPFS');
const ChluInMemoryIndex = require('../src/modules/orbitdb/inmemory');
const ChluAbstractIndex = require('../src/modules/orbitdb/abstract');
const { genMultihash } = require('./utils/ipfs');

function applyOperation(idx, op) {
    return idx.updateIndex({
        values: [{
            payload: Object.assign({
                version: ChluAbstractIndex.version
            }, op)
        }]
    });
}

describe('OrbitDB Module', () => {
    let chluIpfs;

    beforeEach(() => {
        chluIpfs = new ChluIPFS({
            type: ChluIPFS.types.service,
            logger: logger('Service'),
            cache: { enabled: false },
            enablePersistence: false
        });
    });

    it('exposes method to get the list of review records', () => {
        expect(chluIpfs.orbitDb.getReviewRecordList).to.be.a('function');
    });

    it('exposes method to get the latest version of a RR by multihash', () => {
        expect(chluIpfs.orbitDb.get).to.be.a('function');
    });

    describe('Chlu Store InMemory Index', () => {
        let idx;

        beforeEach(() => {
            idx = new ChluInMemoryIndex();
        });

        it('keeps the new review list in order', () => {
            applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                multihash: genMultihash(1)
            });
            applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                multihash: genMultihash(2)
            });
            expect(idx.getReviewRecordList()).to.deep.equal([
                genMultihash(2),
                genMultihash(1)
            ]);
        });

        it('does not duplicate data in the list', () => {
            applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                multihash: genMultihash(1)
            });
            applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                multihash: genMultihash(1)
            });
            expect(idx.getReviewRecordList()).to.deep.equal([genMultihash(1)]);
        });

        it('handles review updates', () => {
            applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                multihash: genMultihash(1)
            });
            applyOperation(idx, {
                op: ChluInMemoryIndex.operations.UPDATE_REVIEW_RECORD,
                multihash: genMultihash(2),
                previousVersionMultihash: genMultihash(1)
            });
            expect(idx.getReviewRecordList()).to.deep.equal([genMultihash(1)]);
            // Base case
            expect(idx.getLatestReviewRecordUpdate(genMultihash(1)))
                .to.deep.equal(genMultihash(2));
            // Next case: submit another update
            applyOperation(idx, {
                op: ChluInMemoryIndex.operations.UPDATE_REVIEW_RECORD,
                multihash: genMultihash(3),
                previousVersionMultihash: genMultihash(2)
            });
            expect(idx.getLatestReviewRecordUpdate(genMultihash(2)))
                .to.deep.equal(genMultihash(3));
            expect(idx.getLatestReviewRecordUpdate(genMultihash(1)))
                .to.deep.equal(genMultihash(3));
            // Next case: submit another update from original hash
            applyOperation(idx, {
                op: ChluInMemoryIndex.operations.UPDATE_REVIEW_RECORD,
                multihash: genMultihash(4),
                previousVersionMultihash: genMultihash(1)
            });
            expect(idx.getLatestReviewRecordUpdate(genMultihash(1)))
                .to.deep.equal(genMultihash(4));
            expect(idx.getLatestReviewRecordUpdate(genMultihash(2)))
                .to.deep.equal(genMultihash(4));
            expect(idx.getLatestReviewRecordUpdate(genMultihash(3)))
                .to.deep.equal(genMultihash(4));
        });
    });
});