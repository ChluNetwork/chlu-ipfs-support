const multihashes = require('multihashes');
const { ECPair, ECSignature } = require('bitcoinjs-lib');
const { multihashToBuffer } = require('../utils/ipfs');

class Crypto {
    constructor(chluIpfs){
        this.chluIpfs = chluIpfs;
        this.pubKeyMultihash = null;
        this.keyPair = null;
    }

    async storePublicKey(pubKey) {
        return await this.chluIpfs.ipfsUtils.put(pubKey);
    }

    async getPublicKey(multihash) {
        return await this.chluIpfs.ipfsUtils.get(multihash);
    }

    async signMultihash(multihash, keyPair) {
        const signature = await keyPair.sign(this.getDigestFromMultihash(multihash));
        return signature.toDER().toString('hex');
    }

    async verifyMultihash(pubKeyMultihash, multihash, signature) {
        const buffer = await this.getPublicKey(pubKeyMultihash);
        const keyPair = await ECPair.fromPublicKeyBuffer(buffer);
        return keyPair.verify(this.getDigestFromMultihash(multihash), ECSignature.fromDER(Buffer.from(signature, 'hex')));
    }

    async signPoPR(obj, keyPair) {
        if (!obj.hash) {
            obj.signature = '';
            obj = await this.chluIpfs.reviewRecords.hashPoPR(obj);
        }
        obj.signature = await this.signMultihash(obj.hash, keyPair);
        delete obj.hash; // causes issues with tests because it is not in the protobuf
        return obj;
    }

    async signReviewRecord(obj, keyPair) {
        if (!obj.hash) {
            obj.signature = '';
            obj = await this.chluIpfs.reviewRecords.hashReviewRecord(obj);
        }
        obj.signature = await this.signMultihash(obj.hash, keyPair);
        return obj;
    }

    async generateKeyPair() {
        this.keyPair = ECPair.makeRandom();
        this.pubKeyMultihash = await this.storePublicKey(this.keyPair.getPublicKeyBuffer());
        return this.keyPair;
    }

    async importKeyPair(exported) {
        this.keyPair = ECPair.fromWIF(exported);
        this.pubKeyMultihash = await this.storePublicKey(this.keyPair.getPublicKeyBuffer());
        return this.keyPair;
    }

    async exportKeyPair() {
        if (this.keyPair) {
            return this.keyPair.toWIF();
        }
    }

    getDigestFromMultihash(multihash){
        const decoded = multihashes.decode(multihashToBuffer(multihash));
        return decoded.digest;
    }
}

module.exports = Crypto;