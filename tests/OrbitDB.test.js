const expect = require('chai').expect;

const ChluIPFS = require('../src/ChluIPFS');
const ChluIndex = require('../src/modules/orbitdb/db-index');
const IPFSUtils = require('../src/utils/ipfs');

function applyOperation(idx, op) {
    return idx.updateIndex({
        values: [{
            payload: Object.assign({
                version: ChluIndex.version
            }, op)
        }]
    });
}

function genMultihash(n = 1) {
    const s = String(n);
    const m = 'Qma3oMFcX16P4P5R2UEs5aAP2HiPymSGgc8ZGf2MBPgaRC'.slice(0, -s.length) + s;
    IPFSUtils.validateMultihash(m);
    return m;
}

describe('OrbitDB Module', () => {
    let chluIpfs;

    beforeEach(() => {
        chluIpfs = new ChluIPFS({ type: ChluIPFS.types.service });
    });

    it('exposes method to get the list of review records', () => {
        expect(chluIpfs.orbitDb.getReviewRecordList).to.be.a('function');
    });

    it('exposes method to get the latest version of a RR by multihash', () => {
        expect(chluIpfs.orbitDb.get).to.be.a('function');
    });

    describe('Chlu Store Index', () => {
        let idx;

        beforeEach(() => {
            idx = new ChluIndex();
        });

        it('keeps the new review list in order', () => {
            applyOperation(idx, {
                op: ChluIndex.operations.ADD_REVIEW_RECORD,
                multihash: genMultihash(1)
            });
            applyOperation(idx, {
                op: ChluIndex.operations.ADD_REVIEW_RECORD,
                multihash: genMultihash(2)
            });
            expect(idx.getReviewRecordList()).to.deep.equal([
                genMultihash(2),
                genMultihash(1)
            ]);
        });

        it('does not duplicate data in the list', () => {
            applyOperation(idx, {
                op: ChluIndex.operations.ADD_REVIEW_RECORD,
                multihash: genMultihash(1)
            });
            applyOperation(idx, {
                op: ChluIndex.operations.ADD_REVIEW_RECORD,
                multihash: genMultihash(1)
            });
            expect(idx.getReviewRecordList()).to.deep.equal([genMultihash(1)]);
        });

        it('handles review updates', () => {
            applyOperation(idx, {
                op: ChluIndex.operations.ADD_REVIEW_RECORD,
                multihash: genMultihash(1)
            });
            applyOperation(idx, {
                op: ChluIndex.operations.UPDATE_REVIEW_RECORD,
                multihash: genMultihash(2),
                previousVersionMultihash: genMultihash(1)
            });
            expect(idx.getReviewRecordList()).to.deep.equal([genMultihash(1)]);
            // Base case
            expect(idx.getLatestReviewRecordUpdate(genMultihash(1)))
                .to.deep.equal(genMultihash(2));
            // Next case: submit another update
            applyOperation(idx, {
                op: ChluIndex.operations.UPDATE_REVIEW_RECORD,
                multihash: genMultihash(3),
                previousVersionMultihash: genMultihash(2)
            });
            expect(idx.getLatestReviewRecordUpdate(genMultihash(2)))
                .to.deep.equal(genMultihash(3));
            expect(idx.getLatestReviewRecordUpdate(genMultihash(1)))
                .to.deep.equal(genMultihash(3));
            // Next case: submit another update from original hash
            applyOperation(idx, {
                op: ChluIndex.operations.UPDATE_REVIEW_RECORD,
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