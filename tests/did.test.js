const expect = require('chai').expect;
const sinon = require('sinon')

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');
const cryptoUtils = require('./utils/crypto')
const { getFakeReviewRecord } = require('./utils/protobuf');
const ipfsUtilsStub = require('./utils/ipfsUtilsStub')

describe('DID Module', () => {
    let chluIpfs, exampleDID, exampleDIDID, makeDID

    beforeEach(async () => {
        chluIpfs = new ChluIPFS({
            type: ChluIPFS.types.vendor,
            enablePersistence: false,
            cache: { enabled: false },
            logger: logger('Vendor')
        });
        // Set up all the stubs of orbit and IPFS so that
        // the DID is returned properly when calling stubbed OrbitDB
        // and stubbed IPFS
        const utils = cryptoUtils(chluIpfs)
        makeDID = utils.makeDID
        exampleDID = await makeDID()
        exampleDIDID = exampleDID.publicDidDocument.id
        const didStore = utils.buildDIDMap([exampleDID])
        const fakeStore = {
            'Qmabc': Buffer.from(JSON.stringify(exampleDID.publicDidDocument))
        }
        // stubs
        chluIpfs.ipfsUtils = ipfsUtilsStub(fakeStore)
        chluIpfs.orbitDb.getDID = sinon.stub().callsFake(async id => didStore[id] ? 'Qmabc' : null)
        chluIpfs.orbitDb.putDID = sinon.stub().callsFake(did => {
            didStore[did.id] = did
        })
        chluIpfs.orbitDb.putDIDAndWaitForReplication = chluIpfs.orbitDb.putDID
    });

    afterEach(() => {
        chluIpfs = null;
    });


    it('signs and verifies Review Records', async () => {
        await chluIpfs.did.start()
        async function verifyRR(rr) {
            const hashed = await chluIpfs.reviewRecords.hashReviewRecord(rr);
            return await chluIpfs.did.verifyMultihash(
                hashed.issuer,
                hashed.hash,
                hashed.issuer_signature
            );
        }
        let reviewRecord = await getFakeReviewRecord();
        reviewRecord = await chluIpfs.did.signReviewRecord(reviewRecord);
        const verification = await verifyRR(reviewRecord);
        expect(verification).to.be.true;
        // Test failure case: change a field and validate again
        reviewRecord.review.text = 'Hellooooo';
        const verificationToFail = await verifyRR(reviewRecord);
        expect(verificationToFail).to.be.false;
    });

    it('retrieves DID by ID', async () => {
        const did = await chluIpfs.did.getDID(exampleDIDID);
        expect(did).to.deep.equal(exampleDID.publicDidDocument);
    });

    it('publishes DID Public Document', async () => {
        await chluIpfs.did.generate()
        await chluIpfs.did.publish() 
        expect(chluIpfs.orbitDb.getDID.calledWith(chluIpfs.did.didId)).to.be.true
        // need to use await here to unpack value from promise, even though the promise
        // is already resolved because it is awaited by the publish() call
        const multihash = await chluIpfs.ipfsUtils.putJSON.returnValues[0]
        const existingMultihash = await chluIpfs.orbitDb.getDID.returnValues[0]
        expect(existingMultihash).to.be.null
        expect(multihash).to.be.a('string')
        expect(chluIpfs.orbitDb.putDID.calledWith(chluIpfs.did.didId, multihash)).to.be.true
    });

    it('generates DID', async () => {
        expect(chluIpfs.did.didId).to.be.null
        expect(chluIpfs.did.publicDidDocument).to.be.null
        expect(chluIpfs.did.privateKeyBase58).to.be.null
        await chluIpfs.did.start()
        expect(chluIpfs.did.didId).to.match(/^did:chlu:/)
        expect(chluIpfs.did.publicDidDocument).to.be.an('object')
        expect(chluIpfs.did.privateKeyBase58).to.be.a('string')
        expect(chluIpfs.did.publicDidDocument.id).to.equal(chluIpfs.did.didId)
    });

    it('imports DID', async () => {
        expect(chluIpfs.did.didId).to.be.null
        expect(chluIpfs.did.publicDidDocument).to.be.null
        expect(chluIpfs.did.privateKeyBase58).to.be.null
        const did = await makeDID()
        await chluIpfs.did.import(did)
        expect(chluIpfs.did.didId).to.match(/^did:chlu:/)
        expect(chluIpfs.did.publicDidDocument).to.be.an('object')
        expect(chluIpfs.did.privateKeyBase58).to.be.a('string')
        expect(chluIpfs.did.publicDidDocument.id).to.equal(chluIpfs.did.didId)
    });

    it('exports DID', async () => {
        await chluIpfs.did.generate()
        expect(chluIpfs.did.didId).to.match(/^did:chlu:/)
        expect(chluIpfs.did.publicDidDocument).to.be.an('object')
        expect(chluIpfs.did.privateKeyBase58).to.be.a('string')
        expect(chluIpfs.did.publicDidDocument.id).to.equal(chluIpfs.did.didId)
        const did = await chluIpfs.did.export()
        expect(chluIpfs.did.publicDidDocument).to.deep.equal(did.publicDidDocument)
        expect(chluIpfs.did.privateKeyBase58).to.deep.equal(did.privateKeyBase58)
    });
});