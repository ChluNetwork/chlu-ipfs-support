const ChluDID = require('chlu-did/src')
const { getDigestFromMultihash } = require('../utils/ipfs')

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
            await this.publish(null, false)
            await this.chluIpfs.persistence.persistData();
        }
    }

    async generate() {
        const did = await this.chluDID.generateDID()
        return this.import(did)
    }

    import(did) {
        this.publicDidDocument = did.publicDidDocument
        this.didId = this.publicDidDocument.id
        this.privateKeyBase58 = did.privateKeyBase58
    }

    export() {
        return {
            publicDidDocument: this.publicDidDocument,
            privateKeyBase58: this.privateKeyBase58
        }
    }

    isPresent() {
        return this.publicDidDocument && this.didId && this.privateKeyBase58
    }

    async sign(data, privateKeyBase58) {
        return this.chluDID.sign(privateKeyBase58 || this.privateKeyBase58, data)
    }

    async verify(didId, data, signature) {
        const didDocument = await this.getDID(didId)
        if (!didDocument) {
            throw new Error(`Cannot verify signature by ${didId}: DID Document not found`)
        }
        return this.chluDID.verify(didDocument, data, signature)
    }

    async signMultihash(multihash, privateKeyBase58) {
        const data = getDigestFromMultihash(multihash)
        const result = await this.sign(data, privateKeyBase58)
        return result.signature
    }

    async verifyMultihash(didId, multihash, signature) {
        const data = getDigestFromMultihash(multihash)
        return this.verify(didId, data, signature) 
    }

    async signPoPR(obj) {
        if (!obj.hash) {
            obj.signature = '';
            obj = await this.chluIpfs.reviewRecords.hashPoPR(obj);
        }
        obj.signature = await this.signMultihash(obj.hash);
        delete obj.hash; // causes issues with tests because it is not in the protobuf
        return obj;
    }

    async signReviewRecord(obj) {
        if (!obj.hash) {
            obj.signature = '';
            obj = await this.chluIpfs.reviewRecords.hashReviewRecord(obj);
        }
        obj.signature = await this.signMultihash(obj.hash);
        return obj;
    }

    async publish(did, waitForReplication = true) {
        if (!did) {
            did = {
                publicDidDocument: this.publicDidDocument,
                privateKeyBase58: this.privateKeyBase58
            }
        }
        const existingMultihash = await this.chluIpfs.orbitDb.getDID(did.publicDidDocument.id, false)
        const multihash = await this.chluIpfs.ipfsUtils.putJSON(did.publicDidDocument)
        if (!existingMultihash || existingMultihash !== multihash) {
            if (waitForReplication) {
                await this.chluIpfs.orbitDb.putDIDAndWaitForReplication(did.publicDidDocument.id, multihash)
            } else {
                await this.chluIpfs.orbitDb.putDID(did.publicDidDocument.id, multihash)
            }
        }
    }

    async getDID(didId) {
        if (didId === this.didId) return this.publicDidDocument
        const wellKnown = this.getWellKnownDID(didId)
        if (wellKnown) return wellKnown
        const multihash = await this.chluIpfs.orbitDb.getDID(didId)
        if (!multihash) return null
        const publicDidDocument = await this.chluIpfs.ipfsUtils.getJSON(multihash)
        return publicDidDocument
    }

    getWellKnownDID(didId) {
        return this.wellKnownDIDs[didId] || null
    }
}

module.exports = ChluIPFSDID