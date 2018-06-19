const ChluDID = require('chlu-did/src')
const { getDigestFromMultihash } = require('../utils/ipfs')

class ChluIPFSDID {

    static isDIDID(didId) {
        return typeof didId === 'string' && didId.indexOf('did:') === 0
    }

    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs 
        this.chluDID = new ChluDID()
        this.didId = null
        this.publicDidDocument = null
        this.privateKeyBase58 = null
    }

    async start() {
        if (!this.isPresent()) {
            // Generate a DID & Publish
            await this.generate();
            await this.publish()
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

    async publish() {
        const existingMultihash = await this.chluIpfs.db.getDID(this.didId)
        const multihash = await this.chluIpfs.ipfs.putJSON(this.publicDidDocument)
        if (existingMultihash !== multihash) {
            await this.chluIpfs.db.putDID(this.didId, multihash)
        }
    }

    async getDID(didId) {
        const multihash = await this.chluIpfs.db.getDID(didId)
        if (!multihash) {
            throw new Error('DID Not Found')
        }
        const publicDidDocument = await this.chluIpfs.ipfs.getJSON(multihash)
        return publicDidDocument
    }
}

module.exports = ChluIPFSDID