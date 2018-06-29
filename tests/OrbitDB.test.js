const expect = require('chai').expect;
const logger = require('./utils/logger');

const ChluIPFS = require('../src/ChluIPFS');
const ChluInMemoryIndex = require('../src/modules/orbitdb/inmemory');
const ChluAbstractIndex = require('../src/modules/orbitdb/abstract');
const { genMultihash } = require('./utils/ipfs');

async function applyOperation(idx, op) {
    return await idx.updateIndex({
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
        expect(chluIpfs.orbitDb.getLatestReviewRecordUpdate).to.be.a('function');
    });

    describe('Chlu Store InMemory Index', () => {
        let idx;

        beforeEach(() => {
            idx = new ChluInMemoryIndex();
        });

        it('keeps the new review list in order', async () => {
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                multihash: genMultihash(1)
            });
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                multihash: genMultihash(2)
            });
            await expect(await idx.getReviewRecordList()).to.deep.equal([
                genMultihash(2),
                genMultihash(1)
            ]);
        });

        it('does not duplicate data in the list', async () => {
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                multihash: genMultihash(1)
            });
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                multihash: genMultihash(1)
            });
            expect(await idx.getReviewRecordList()).to.deep.equal([genMultihash(1)]);
        });

        it('handles review updates', async () => {
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                multihash: genMultihash(1)
            });
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.UPDATE_REVIEW_RECORD,
                multihash: genMultihash(2),
                previousVersionMultihash: genMultihash(1)
            });
            expect(await idx.getReviewRecordList()).to.deep.equal([genMultihash(1)]);
            // Base case
            expect(await idx.getLatestReviewRecordUpdate(genMultihash(1)))
                .to.deep.equal(genMultihash(2));
            // Next case: submit another update
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.UPDATE_REVIEW_RECORD,
                multihash: genMultihash(3),
                previousVersionMultihash: genMultihash(2)
            });
            expect(await idx.getLatestReviewRecordUpdate(genMultihash(2)))
                .to.deep.equal(genMultihash(3));
            expect(await idx.getLatestReviewRecordUpdate(genMultihash(1)))
                .to.deep.equal(genMultihash(3));
            // Next case: submit another update from original hash
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.UPDATE_REVIEW_RECORD,
                multihash: genMultihash(4),
                previousVersionMultihash: genMultihash(1)
            });
            expect(await idx.getLatestReviewRecordUpdate(genMultihash(1)))
                .to.deep.equal(genMultihash(4));
            expect(await idx.getLatestReviewRecordUpdate(genMultihash(2)))
                .to.deep.equal(genMultihash(4));
            expect(await idx.getLatestReviewRecordUpdate(genMultihash(3)))
                .to.deep.equal(genMultihash(4));
        });

        it('handles DIDs', async () => {
            expect(await idx.getDID('did:chlu:abc')).to.be.null
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.PUT_DID,
                didId: 'did:chlu:abc',
                multihash: genMultihash(1)
            })
            expect(await idx.getDID('did:chlu:abc')).to.equal(genMultihash(1))
            // replaces old value
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.PUT_DID,
                didId: 'did:chlu:abc',
                multihash: genMultihash(2)
            })
            expect(await idx.getDID('did:chlu:abc')).to.equal(genMultihash(2))
        })

        it('returns reviews by DID', async () => {
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                didId: 'did:chlu:abc',
                multihash: genMultihash(1)
            })
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                didId: 'did:chlu:abc',
                multihash: genMultihash(2)
            })
            expect(await idx.getReviewsByDID('did:chlu:abc')).to.deep.equal([
                genMultihash(1),
                genMultihash(2)
            ])
            
        })

    });
});