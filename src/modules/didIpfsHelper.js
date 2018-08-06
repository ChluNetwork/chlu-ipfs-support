const ChluDID = require('chlu-did/src')
const { getDigestFromMultihash } = require('../utils/ipfs')
const { isObject, isString, get, pick } = require('lodash')

class ChluDIDIPFSHelper {

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
        this.chluIpfs.logger.debug('Generating DID ...')
        const did = await this.chluDID.generateDID()
        this.chluIpfs.logger.debug(`Generated DID ${did.publicDidDocument.id}`)
        return await this.import(did, publish, waitForReplication)
    }

    async import(did, publish = true, waitForReplication = false) {
        this.chluIpfs.logger.debug(`Importing DID ${did.publicDidDocument.id}, publish: ${publish ? 'yes' : 'no'}`)
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

    async verify(didId, data, signature, waitUntilPresent = false) {
        if (!didId) throw new Error('Missing DID ID')
        const didDocument = await this.getDID(didId, waitUntilPresent)
        if (!didDocument) {
            throw new Error(`Cannot verify signature by ${didId}: DID Document not found`)
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

    async verifyMultihash(didId, multihash, signature, waitUntilPresent) {
        this.chluIpfs.logger.debug(`Verifying signature by ${didId} on ${multihash}: ${signature.signatureValue}`);
        if (signature.type !== 'did:chlu') {
            throw new Error('Unhandled signature type')
        }
        if (didId !== signature.creator) {
            throw new Error(`Expected data to be signed by ${didId}, found ${signature.creator} instead`)
        }
        const data = getDigestFromMultihash(multihash)
        const result = await this.verify(signature.creator, data, signature.signatureValue, waitUntilPresent) 
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
                await this.chluIpfs.orbitDb.putDIDAndWaitForReplication(publicDidDocument.id, multihash, signature)
            } else {
                await this.chluIpfs.orbitDb.putDID(publicDidDocument.id, multihash, signature)
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
        const multihash = await this.chluIpfs.orbitDb.getDID(didId, waitUntilPresent)
        if (!multihash) {
            this.chluIpfs.logger.debug(`GetDID ${didId} not found`)
            return null
        }
        const data = await this.readPublicDIDDocument(multihash)
        this.chluIpfs.logger.debug(`GetDID ${didId} => ${multihash} => ${JSON.stringify(data)}`)
        // TODO: maybe this should return the multihash too
        return data
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