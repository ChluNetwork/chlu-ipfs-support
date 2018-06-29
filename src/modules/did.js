const ChluDID = require('chlu-did/src')
const { getDigestFromMultihash } = require('../utils/ipfs')
const { isObject, isString } = require('lodash')

class ChluIPFSDID {

    static isDIDID(didId) {
        return typeof didId === 'string' && didId.indexOf('did:') === 0
    }

    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs 
        // ChluDID instance
        this.chluDID = new ChluDID()
        // Well Known DIDs
        // used for hardcoded DIDs in tests
        // and will also be used for stuff like official Chlu trusted DIDs
        this.wellKnownDIDs = {}
        this.didId = null
        this.publicDidDocument = null
        this.privateKeyBase58 = null
    }

    async start() {
        if (!this.isPresent()) {
            // Generate a DID & Publish
            await this.generate();
            await this.chluIpfs.persistence.persistData();
        }
    }

    async generate(publish, waitForReplication) {
        const did = await this.chluDID.generateDID()
        return await this.import(did, publish, waitForReplication)
    }

    async import(did, publish = true, waitForReplication = false) {
        this.publicDidDocument = did.publicDidDocument
        this.didId = this.publicDidDocument.id
        this.privateKeyBase58 = did.privateKeyBase58
        await this.chluIpfs.persistence.persistData()
        if (publish) await this.publish(null, waitForReplication)
    }

    export() {
        return {
            publicDidDocument: this.publicDidDocument,
            privateKeyBase58: this.privateKeyBase58
        }
    }

    isPresent() {
        return (
            isObject(this.publicDidDocument)
            && isString(this.didId)
            && isString(this.privateKeyBase58)
        )
    }

    async sign(data, privateKeyBase58) {
        return this.chluDID.sign(privateKeyBase58 || this.privateKeyBase58, data)
    }

    async verify(didId, data, signature, waitUntilPresent = false) {
        if (!didId) throw new Error('Missing DID ID')
        const didDocument = await this.getDID(didId, waitUntilPresent)
        if (!didDocument) {
            throw new Error(`Cannot verify signature by ${didId}: DID Document not found`)
        }
        return await this.chluDID.verify(didDocument, data, signature)
    }

    async signMultihash(multihash, did) {
        if (!did) did = {
            privateKeyBase58: this.privateKeyBase58,
            publicDidDocument: this.publicDidDocument
        }
        const data = getDigestFromMultihash(multihash)
        const result = await this.sign(data, did.privateKeyBase58)
        // TODO: Review this!
        return {
            type: 'did:chlu',
            created: 0,
            nonce: '',
            creator: did.publicDidDocument.id,
            signatureValue: result.signature
        }
    }

    async verifyMultihash(didId, multihash, signature) {
        if (signature.type !== 'did:chlu') {
            throw new Error('Unhandled signature type')
        }
        if (didId !== signature.creator) {
            throw new Error(`Expected data to be signed by ${didId}, found ${signature.creator} instead`)
        }
        const data = getDigestFromMultihash(multihash)
        return await this.verify(signature.creator, data, signature.signatureValue) 
    }

    async signReviewRecord(obj, asIssuer = true, asCustomer = true) {
        if (asIssuer) {
            obj.issuer = this.didId
        }
        // TODO: write customer did id ? where ?
        // IMPORTANT: the fields must change before the hashing
        obj = await this.chluIpfs.reviewRecords.hashReviewRecord(obj);
        const signature = await this.signMultihash(obj.hash);
        if (asIssuer) {
            obj.issuer_signature = signature
        }
        if (asCustomer) {
            obj.customer_signature = signature
        }
        return obj;
    }

    async publish(publicDidDocument, waitForReplication = true) {
        if (!publicDidDocument) publicDidDocument = this.publicDidDocument
        const existingMultihash = await this.chluIpfs.orbitDb.getDID(publicDidDocument.id, false)
        const multihash = await this.chluIpfs.ipfsUtils.putJSON(publicDidDocument)
        if (!existingMultihash || existingMultihash !== multihash) {
            if (waitForReplication) {
                await this.chluIpfs.orbitDb.putDIDAndWaitForReplication(publicDidDocument.id, multihash)
            } else {
                await this.chluIpfs.orbitDb.putDID(publicDidDocument.id, multihash)
            }
        }
    }

    async getDID(didId, waitUntilPresent = false) {
        if (didId === this.didId) return this.publicDidDocument
        const wellKnown = this.getWellKnownDID(didId)
        if (wellKnown) return wellKnown
        const multihash = await this.chluIpfs.orbitDb.getDID(didId, waitUntilPresent)
        if (!multihash) return null
        return await this.chluIpfs.ipfsUtils.getJSON(multihash)
    }

    getWellKnownDID(didId) {
        return this.wellKnownDIDs[didId] || null
    }
}

module.exports = ChluIPFSDID