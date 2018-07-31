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
        await chluIpfs.didIpfsHelper.start()
        async function verifyRR(rr) {
            const hashed = await chluIpfs.reviewRecords.hashReviewRecord(rr);
            const issuer = await chluIpfs.didIpfsHelper.verifyMultihash(
                hashed.issuer,
                hashed.hash,
                hashed.issuer_signature
            );
            const customer = await chluIpfs.didIpfsHelper.verifyMultihash(
                hashed.customer_signature.creator,
                hashed.hash,
                hashed.customer_signature
            )
            expect(hashed.issuer).to.equal(chluIpfs.didIpfsHelper.didId)
            expect(hashed.customer_signature.creator).to.equal(chluIpfs.didIpfsHelper.didId)
            return issuer && customer
        }
        let reviewRecord = await getFakeReviewRecord();
        reviewRecord = await chluIpfs.didIpfsHelper.signReviewRecord(reviewRecord);
        const verification = await verifyRR(reviewRecord);
        expect(verification).to.be.true;
        // Test failure case: change a field and validate again
        reviewRecord.review.text = 'Hellooooo';
        const verificationToFail = await verifyRR(reviewRecord);
        expect(verificationToFail).to.be.false;
    });

    it('retrieves DID by ID', async () => {
        const did = await chluIpfs.didIpfsHelper.getDID(exampleDIDID);
        expect(did).to.deep.equal(exampleDID.publicDidDocument);
    });

    it('publishes DID Public Document', async () => {
        await chluIpfs.didIpfsHelper.generate()
        await chluIpfs.didIpfsHelper.publish() 
        expect(chluIpfs.orbitDb.getDID.calledWith(chluIpfs.didIpfsHelper.didId)).to.be.true
        // need to use await here to unpack value from promise, even though the promise
        // is already resolved because it is awaited by the publish() call
        const multihash = await chluIpfs.ipfsUtils.putJSON.returnValues[0]
        const existingMultihash = await chluIpfs.orbitDb.getDID.returnValues[0]
        expect(existingMultihash).to.be.null
        expect(multihash).to.be.a('string')
        expect(chluIpfs.orbitDb.putDID.calledWith(chluIpfs.didIpfsHelper.didId, multihash)).to.be.true
    });

    it('generates DID', async () => {
        expect(chluIpfs.didIpfsHelper.didId).to.be.null
        expect(chluIpfs.didIpfsHelper.publicDidDocument).to.be.null
        expect(chluIpfs.didIpfsHelper.privateKeyBase58).to.be.null
        await chluIpfs.didIpfsHelper.start()
        expect(chluIpfs.didIpfsHelper.didId).to.match(/^did:chlu:/)
        expect(chluIpfs.didIpfsHelper.publicDidDocument).to.be.an('object')
        expect(chluIpfs.didIpfsHelper.privateKeyBase58).to.be.a('string')
        expect(chluIpfs.didIpfsHelper.publicDidDocument.id).to.equal(chluIpfs.didIpfsHelper.didId)
    });

    it('imports DID', async () => {
        expect(chluIpfs.didIpfsHelper.didId).to.be.null
        expect(chluIpfs.didIpfsHelper.publicDidDocument).to.be.null
        expect(chluIpfs.didIpfsHelper.privateKeyBase58).to.be.null
        const did = await makeDID()
        await chluIpfs.didIpfsHelper.import(did)
        expect(chluIpfs.didIpfsHelper.didId).to.match(/^did:chlu:/)
        expect(chluIpfs.didIpfsHelper.publicDidDocument).to.be.an('object')
        expect(chluIpfs.didIpfsHelper.privateKeyBase58).to.be.a('string')
        expect(chluIpfs.didIpfsHelper.publicDidDocument.id).to.equal(chluIpfs.didIpfsHelper.didId)
    });

    it('exports DID', async () => {
        await chluIpfs.didIpfsHelper.generate()
        expect(chluIpfs.didIpfsHelper.didId).to.match(/^did:chlu:/)
        expect(chluIpfs.didIpfsHelper.publicDidDocument).to.be.an('object')
        expect(chluIpfs.didIpfsHelper.privateKeyBase58).to.be.a('string')
        expect(chluIpfs.didIpfsHelper.publicDidDocument.id).to.equal(chluIpfs.didIpfsHelper.didId)
        const did = await chluIpfs.didIpfsHelper.export()
        expect(chluIpfs.didIpfsHelper.publicDidDocument).to.deep.equal(did.publicDidDocument)
        expect(chluIpfs.didIpfsHelper.privateKeyBase58).to.deep.equal(did.privateKeyBase58)
    });
});