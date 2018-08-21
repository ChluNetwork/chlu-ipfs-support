const ChluDID = require('chlu-did/src')
const { getDigestFromMultihash } = require('../utils/ipfs')
const { isObject, isString, get, pick } = require('lodash')

class ChluDIDIPFSHelper {

    static isDIDID(didId) {
        return typeof didId === 'string' && didId.indexOf('did:') === 0
    }

    constructor(chluIpfs, did = null) {
        this.chluIpfs = chluIpfs 
        // ChluDID instance
        this.chluDID = new ChluDID()
        // Well Known DIDs
        // used for hardcoded DIDs in tests
        // and will also be used for stuff like official Chlu trusted DIDs
        this.wellKnownDIDs = {}
        this.didToImport = did
        this.didId = null
        this.publicDidDocument = null
        this.privateKeyBase58 = null
    }

    async start() {
        if (!this.isPresent()) {
            if (this.didToImport) {
                await this.import(this.didToImport)
            } else {
                await this.generate();
            }
        }
    }

    async generate(publish, waitForReplication) {
        this.chluIpfs.logger.debug('Generating DID ...')
        const did = await this.chluDID.generateDID()
        this.chluIpfs.logger.debug(`Generated DID ${did.publicDidDocument.id}`)
        return await this.import(did, publish, waitForReplication)
    }

    async import(did, publish = true, waitForReplication = false) {
        this.chluIpfs.logger.debug(`Importing DID ${did.publicDidDocument.id}, publish: ${publish ? 'yes' : 'no'}`)
        // TODO: check that the ID is the same and don't import, be idempotent
        this.publicDidDocument = did.publicDidDocument
        this.didId = this.publicDidDocument.id
        this.privateKeyBase58 = did.privateKeyBase58
        await this.chluIpfs.persistence.persistData()
        if (publish) await this.publish(null, waitForReplication)
        this.chluIpfs.logger.debug(`Importing DID ${did.publicDidDocument.id} DONE`)
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

    async verify(did, data, signature, waitUntilPresent = false) {
        let didDocument
        if (typeof did === 'string') {
            didDocument = await this.getDID(did, waitUntilPresent)
            if (!didDocument) {
                throw new Error(`Cannot verify signature by ${did}: DID Document not found`)
            }
        } else if (typeof did === 'object') {
            didDocument = did
        }
        return await this.chluDID.verify(didDocument, data, signature)
    }

    async signMultihash(multihash, did = null) {
        if (!did) did = {
            privateKeyBase58: this.privateKeyBase58,
            publicDidDocument: this.publicDidDocument
        }
        const data = getDigestFromMultihash(multihash)
        const result = await this.sign(data, did.privateKeyBase58)
        // TODO: Review this!
        return {
            type: 'did:chlu',
            created: 0, // TODO: add timestamps
            nonce: '',
            creator: did.publicDidDocument.id,
            signatureValue: result.signature
        }
    }

    async verifyMultihash(did, multihash, signature, waitUntilPresent) {
        const didId = typeof did === 'string' ? did : get(did, 'id')
        if (!didId) throw new Error('Missing DID ID')
        this.chluIpfs.logger.debug(`Verifying signature by ${didId} on ${multihash}: ${signature.signatureValue}`);
        if (signature.type !== 'did:chlu') {
            throw new Error('Unhandled signature type')
        }
        if (didId !== signature.creator) {
            throw new Error(`Expected data to be signed by ${didId}, found ${signature.creator} instead`)
        }
        const data = getDigestFromMultihash(multihash)
        const result = await this.verify(did, data, signature.signatureValue, waitUntilPresent) 
        this.chluIpfs.logger.debug(`Verified signature by ${signature.creator} on ${multihash}: ${signature.signatureValue} => ${result}`);
        return result
    }

    async verifyMultihashWithDIDDocumentMultihash(didDocumentMultihash, multihash, signature) {
        if (!get(signature, 'signatureValue')) {
            throw new Error('Missing signature value')
        }
        const publicDidDocument = await this.chluIpfs.ipfsUtils.getJSON(didDocumentMultihash)
        this.chluIpfs.logger.debug(`Verifying signature by ${publicDidDocument.id} on ${multihash}: ${signature.signatureValue}`);
        if (signature.type !== 'did:chlu') {
            throw new Error('Unhandled signature type')
        }
        if (publicDidDocument.id !== signature.creator) {
            throw new Error(`Expected data to be signed by ${publicDidDocument.id}, found ${signature.creator} instead`)
        }
        const data = getDigestFromMultihash(multihash)
        const result = await this.chluDID.verify(publicDidDocument, data, signature.signatureValue) 
        this.chluIpfs.logger.debug(`Verified signature by ${publicDidDocument.id} on ${multihash}: ${signature.signatureValue} => ${result}`);
        return result
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

    async publish(did, waitForReplication = true) {
        let publicDidDocument, privateKeyBase58, signature
        if (did) { 
            publicDidDocument = did.publicDidDocument
            signature = did.signature
            privateKeyBase58 = did.privateKeyBase58
        } else {
            publicDidDocument = this.publicDidDocument
            privateKeyBase58 = this.privateKeyBase58
        }
        this.chluIpfs.logger.debug(`Publishing DID ${publicDidDocument.id}, waitForReplication: ${waitForReplication ? 'yes' : 'no'}`)
        const multihash = await this.storePublicDIDDocument(publicDidDocument)
        if (!signature) {
            this.chluIpfs.logger.debug(`Publishing DID ${publicDidDocument.id}: missing signature, signing...`)
            if (privateKeyBase58) {
                // Create signature
                signature = await this.signMultihash(multihash, { publicDidDocument, privateKeyBase58 })
            } else {
                throw new Error('Missing signature and private key, cannot sign Public DID Document')
            }
        } else {
            this.chluIpfs.logger.debug(`Publishing DID ${publicDidDocument.id}: signature provided by caller`)
        }
        // Validate signature
        const valid = await this.verifyMultihashWithDIDDocumentMultihash(multihash, multihash, signature)
        if (!valid) {
            throw new Error('Signature is invalid')
        } else {
            this.chluIpfs.logger.debug(`Publishing DID ${publicDidDocument.id}: signature was valid`)
        }
        const existingMultihash = await this.chluIpfs.orbitDb.getDID(publicDidDocument.id, false)
        if (!existingMultihash || existingMultihash !== multihash) {
            this.chluIpfs.logger.debug(`Publishing DID ${publicDidDocument.id}: publish required, writing to OrbitDB...`)
            if (waitForReplication) {
                await this.chluIpfs.orbitDb.putDIDAndWaitForReplication(multihash, signature)
            } else {
                await this.chluIpfs.orbitDb.putDID(multihash, signature)
            }
            this.chluIpfs.logger.debug(`Publish DID ${publicDidDocument.id} DONE`)
        } else {
            this.chluIpfs.logger.debug(`Publishing DID ${publicDidDocument.id}: already published, no operation required`)
        }
    }

    async getDID(didId, waitUntilPresent = false) {
        this.chluIpfs.logger.debug(`GetDID ${didId} => ...`)
        if (didId === this.didId) {
            this.chluIpfs.logger.debug(`GetDID ${didId}: this is my DID, returning in memory copy`)
            return this.publicDidDocument
        }
        const wellKnown = this.getWellKnownDID(didId)
        if (wellKnown) {
            this.chluIpfs.logger.debug(`GetDID ${didId}: this is a well known DID, returning in memory copy`)
            return wellKnown
        }
        this.chluIpfs.logger.debug(`GetDID ${didId}: calling OrbitDB ${waitUntilPresent ? ', Waiting until present' : ''}`)
        const didData = await this.chluIpfs.orbitDb.getDID(didId, waitUntilPresent)
        if (!get(didData, 'multihash')) {
            this.chluIpfs.logger.debug(`GetDID ${didId} not found`)
            return null
        }
        const multihash = didData.multihash
        // TODO: maybe return multihash too?
        if (get(didData, 'publicDidDocument')) {
            const publicDidDocument = didData.publicDidDocument
            this.chluIpfs.logger.debug(`GetDID ${didId} => ${multihash} => ${JSON.stringify(publicDidDocument)}`)
            return publicDidDocument
        } else {
            this.chluIpfs.logger.debug(`GetDID ${didId} => ${multihash} => reading from IPFS ...`)
            const data = await this.readPublicDIDDocument(multihash)
            this.chluIpfs.logger.debug(`GetDID ${didId} => ${multihash} => ${JSON.stringify(data)}`)
            return data
        }
    }

    async readPublicDIDDocument(multihash) {
        return await this.chluIpfs.ipfsUtils.getJSON(multihash)
    }

    async storePublicDIDDocument(publicDidDocument) {
        // Make sure only relevant fields are stored
        const prepared = pick(publicDidDocument, [
            '@context',
            'id',
            'publicKey',
            'authentication'
        ])
        const multihash = await this.chluIpfs.ipfsUtils.putJSON(prepared)
        return multihash
    }

    getWellKnownDID(didId) {
        return this.wellKnownDIDs[didId] || null
    }
}

module.exports = ChluDIDIPFSHelper