const multihashes = require('multihashes');
const { ECPair, ECSignature } = require('bitcoinjs-lib');
const { multihashToBuffer } = require('../utils/ipfs');

class Vendor {
    constructor(chluIpfs){
        this.chluIpfs = chluIpfs;
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
        obj.signature = '';
        if (!obj.hash) {
            obj = await this.chluIpfs.reviewRecords.hashPoPR(obj);
        }
        obj.signature = await this.signMultihash(obj.hash, keyPair);
        return obj;
    }

    async verifyPoPR(popr, pubKeyMultihash) {
        // TODO: DEPRECATED: use validator
        let obj = Object.assign({}, popr);
        const signature = obj.signature.slice(0); // make a copy
        obj.signature = '';
        obj = await this.chluIpfs.reviewRecords.hashPoPR(obj);
        return await this.verifyMultihash(pubKeyMultihash, obj.hash, signature);
    }

    getDigestFromMultihash(multihash){
        const decoded = multihashes.decode(multihashToBuffer(multihash));
        return decoded.digest;
    }
}

module.exports = Vendor;