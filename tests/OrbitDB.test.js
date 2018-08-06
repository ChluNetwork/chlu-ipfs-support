const expect = require('chai').expect;
const logger = require('./utils/logger');
const sinon = require('sinon')

const ChluIPFS = require('../src/ChluIPFS');
const ChluInMemoryIndex = require('../src/modules/orbitdb/indexes/inmemory');
const ChluAbstractIndex = require('../src/modules/orbitdb/indexes/abstract');
const { genMultihash } = require('./utils/ipfs');
const { getFakeReviewRecord } = require('./utils/protobuf');

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
    let chluIpfs, reviewOverride = null, didOverride = null;

    beforeEach(() => {
        chluIpfs = new ChluIPFS({
            logger: logger('Service'),
            cache: { enabled: false },
            enablePersistence: false
        });
        chluIpfs.reviewRecords.readReviewRecord = sinon.stub()
            .callsFake(async multihash => Object.assign({ multihash }, await getFakeReviewRecord(), reviewOverride || {}))
        chluIpfs.didIpfsHelper.readPublicDIDDocument = sinon.stub()
            .callsFake(async () => Object.assign({
                id: 'did:chlu:random'
            }, didOverride || {}))
        chluIpfs.didIpfsHelper.verifyMultihashWithDIDDocumentMultihash = sinon.stub().resolves(true)
        // TODO: test that the three functions above are called with right parameters
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
            idx.chluIpfs = chluIpfs
            reviewOverride = null
            didOverride = null
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
            reviewOverride = { previous_version_multihash: genMultihash(1) }
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                multihash: genMultihash(2)
            });
            reviewOverride = null
            expect(await idx.getReviewRecordList()).to.deep.equal([genMultihash(1)]);
            // Base case
            expect(await idx.getLatestReviewRecordUpdate(genMultihash(1)))
                .to.deep.equal(genMultihash(2));
            // Next case: submit another update
            reviewOverride = { previous_version_multihash: genMultihash(2) }
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                multihash: genMultihash(3)
            });
            reviewOverride = null
            expect(await idx.getLatestReviewRecordUpdate(genMultihash(2)))
                .to.deep.equal(genMultihash(3));
            expect(await idx.getLatestReviewRecordUpdate(genMultihash(1)))
                .to.deep.equal(genMultihash(3));
            // Next case: submit another update from original hash
            reviewOverride = { previous_version_multihash: genMultihash(1) }
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                multihash: genMultihash(4)
            });
            reviewOverride = null
            expect(await idx.getLatestReviewRecordUpdate(genMultihash(1)))
                .to.deep.equal(genMultihash(4));
            expect(await idx.getLatestReviewRecordUpdate(genMultihash(2)))
                .to.deep.equal(genMultihash(4));
            expect(await idx.getLatestReviewRecordUpdate(genMultihash(3)))
                .to.deep.equal(genMultihash(4));
        });

        it('handles DIDs', async () => {
            const didId = 'did:chlu:abc'
            expect((await idx.getDID(didId)).multihash).to.be.null
            didOverride = { id: didId }
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.PUT_DID,
                multihash: genMultihash(1)
            })
            expect((await idx.getDID(didId)).multihash).to.equal(genMultihash(1))
            // replaces old value
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.PUT_DID,
                multihash: genMultihash(2)
            })
            expect((await idx.getDID(didId)).multihash).to.equal(genMultihash(2))
        })

        it('returns reviews about subject DID', async () => {
            const didId = 'did:chlu:abc'
            reviewOverride = { popr: { vendor_did: didId } }
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                didId, // Retrocompatibility
                multihash: genMultihash(1)
            })
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                subjectDidId: didId,
                multihash: genMultihash(2)
            })
            expect(await idx.getReviewsAboutDID(didId)).to.deep.equal([
                genMultihash(2),
                genMultihash(1)
            ])
            expect(await idx.getReviewsWrittenByDID(didId)).to.deep.equal([])
        })

        it('returns reviews written by author DID', async () => {
            const didId = 'did:chlu:abc'
            reviewOverride = { customer_signature: { creator: didId } }
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                authorDidId: didId, // Retroncompatibility
                multihash: genMultihash(1)
            })
            await applyOperation(idx, {
                op: ChluInMemoryIndex.operations.ADD_REVIEW_RECORD,
                authorDidId: didId,
                multihash: genMultihash(2)
            })
            expect(await idx.getReviewsWrittenByDID(didId)).to.deep.equal([
                genMultihash(2),
                genMultihash(1)
            ])
            expect(await idx.getReviewsAboutDID(didId)).to.deep.equal([])
        })



    });
});