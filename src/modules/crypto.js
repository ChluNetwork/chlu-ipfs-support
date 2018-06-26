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
        return result.toHex()
    }

    async verifyMultihash(pubKeyMultihash, multihash, signature) {
        this.chluIpfs.logger.debug(`Verifying multihash ${pubKeyMultihash} ${multihash} ${signature}`);
        const buffer = await this.getPublicKey(pubKeyMultihash);
        const keyPair = this.ec.keyFromPublic(buffer.toString('hex'))
        const data = getDigestFromMultihash(multihash).toString('hex')
        const result = keyPair.verify(data, signature);
        this.chluIpfs.logger.debug(`Verifying multihash ${pubKeyMultihash} ${multihash} ${signature} ..... ${result}`);
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
