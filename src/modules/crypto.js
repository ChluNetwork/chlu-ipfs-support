const { ECPair, ECSignature } = require('bitcoinjs-lib');
const { getDigestFromMultihash } = require('../utils/ipfs')

// TODO: switch this module to elliptic

class Crypto {
    constructor(chluIpfs){
        this.chluIpfs = chluIpfs;
    }

    async storePublicKey(pubKey) {
        return await this.chluIpfs.ipfsUtils.put(pubKey);
    }

    async getPublicKey(multihash) {
        this.chluIpfs.logger.debug('Fetching Public Key at ' + multihash);
        const value = await this.chluIpfs.ipfsUtils.get(multihash);
        this.chluIpfs.logger.debug('Fetched Public Key at ' + multihash + ': ' + value.toString('hex'));
        return value;
    }

    async signMultihash(multihash, keyPair) {
        const signature = await keyPair.sign(getDigestFromMultihash(multihash));
        return signature.toDER().toString('hex');
    }

    async verifyMultihash(pubKeyMultihash, multihash, signature) {
        this.chluIpfs.logger.debug(`Verifying multihash ${pubKeyMultihash} ${multihash} ${signature}`);
        const buffer = await this.getPublicKey(pubKeyMultihash);
        const keyPair = await ECPair.fromPublicKeyBuffer(buffer);
        const result = keyPair.verify(getDigestFromMultihash(multihash), ECSignature.fromDER(Buffer.from(signature, 'hex')));
        this.chluIpfs.logger.debug(`Verifying multihash ${pubKeyMultihash} ${multihash} ${signature} ..... ${result}`);
        return result;
    }

    async generateKeyPair() {
        const keyPair = ECPair.makeRandom();
        const pubKeyMultihash = await this.storePublicKey(keyPair.getPublicKeyBuffer());
        return { keyPair, pubKeyMultihash };
    }

    async importKeyPair(exported) {
        const keyPair = ECPair.fromWIF(exported);
        const pubKeyMultihash = await this.storePublicKey(keyPair.getPublicKeyBuffer());
        return { keyPair, pubKeyMultihash };
    }

    async exportKeyPair(keyPair) {
        return keyPair.toWIF();
    }
}

module.exports = Crypto;
