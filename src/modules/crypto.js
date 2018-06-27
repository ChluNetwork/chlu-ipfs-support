const elliptic = require('elliptic')
const brorand = require('brorand')
const { getDigestFromMultihash } = require('../utils/ipfs')

// TODO: switch this module to elliptic

class Crypto {
    constructor(chluIpfs){
        this.chluIpfs = chluIpfs;
        this.ec = new elliptic.eddsa('ed25519')
        this.rand = brorand
    }

    async storePublicKey(pubKey) {
        const buffer = Buffer.from(pubKey, 'hex')
        return await this.chluIpfs.ipfsUtils.put(buffer);
    }

    async getPublicKey(multihash) {
        this.chluIpfs.logger.debug('Fetching Public Key at ' + multihash);
        const value = await this.chluIpfs.ipfsUtils.get(multihash);
        this.chluIpfs.logger.debug('Fetched Public Key at ' + multihash + ': ' + value.toString('hex'));
        return value;
    }

    async signMultihash(multihash, keyPair) {
        const data = getDigestFromMultihash(multihash).toString('hex')
        const result = await keyPair.sign(data);
        const pubKeyMultihash = await this.storePublicKey(keyPair.getPublic('hex'))
        // TODO: review this
        return {
            type: 'crypto',
            created: 0,
            nonce: '',
            creator: pubKeyMultihash,
            signatureValue: result.toHex()
        }
    }

    async verifyMultihash(pubKeyMultihash, multihash, signature) {
        if (signature.type !== 'crypto') {
            throw new Error('Unhandled signature type')
        }
        if (pubKeyMultihash !== signature.creator) {
            throw new Error(`Expected data to be signed by ${pubKeyMultihash}, found ${signature.creator} instead`)
        }
        this.chluIpfs.logger.debug(`Verifying signature by ${signature.creator} on ${multihash}: ${signature.signatureValue}`);
        const buffer = await this.getPublicKey(signature.creator);
        const keyPair = this.ec.keyFromPublic(buffer.toString('hex'))
        const data = getDigestFromMultihash(multihash).toString('hex')
        const result = keyPair.verify(data, signature.signatureValue);
        this.chluIpfs.logger.debug(`Verified signature by ${signature.creator} on ${multihash}: ${signature.signatureValue} => ${result}`);
        return result;
    }

    async signPoPR(obj, keyPair) {
        if (!obj.hash) {
            // TODO: review this
            obj.sig = {
                type: 'empty',
                created: 0,
                nonce: '',
                creator: '',
                signatureValue: ''
            };
            obj = await this.chluIpfs.reviewRecords.hashPoPR(obj);
        }
        obj.sig = await this.signMultihash(obj.hash, keyPair);
        delete obj.hash; // causes issues with tests because it is not in the protobuf
        return obj;
    }

    async generateKeyPair(store = true) {
        const keyPair = this.ec.keyFromSecret(this.rand(128))
        if (store) {
            const pubKeyMultihash = await this.storePublicKey(keyPair.getPublic('hex'));
            return { keyPair, pubKeyMultihash };
        } else {
            return { keyPair }
        }
    }

    async importKeyPair(exported) {
        const keyPair = this.ec.keyFromSecret(exported)
        const pubKeyMultihash = await this.storePublicKey(keyPair.getPublic('hex'));
        return { keyPair, pubKeyMultihash };
    }

    async exportKeyPair(keyPair) {
        return keyPair.getSecret('hex')
    }
}

module.exports = Crypto;
