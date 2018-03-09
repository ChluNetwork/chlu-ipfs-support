const { ECPair } = require('bitcoinjs-lib');

module.exports = function cryptoTestUtils(chluIpfs) {
    return {
        async makeKeyPair() {
            const keyPair = ECPair.makeRandom();
            const multihash = await chluIpfs.crypto.storePublicKey(keyPair.getPublicKeyBuffer());
            return {
                keyPair,
                multihash
            };
        },

        async preparePoPR(popr, vm, v, m) {
            popr.key_location = '/ipfs/' + vm.multihash;
            popr.vendor_key_location = '/ipfs/' + v.multihash;
            popr.marketplace_signature = await chluIpfs.crypto.signMultihash(vm.multihash, m.keyPair);
            popr.vendor_signature = await chluIpfs.crypto.signMultihash(vm.multihash, v.keyPair);
            return await chluIpfs.crypto.signPoPR(popr, vm.keyPair);
        }
    };
};