const { ECPair } = require('bitcoinjs-lib');
const ChluDID = require('chlu-did/src')

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

        async makeDID() {
            const DID = new ChluDID()
            const did = await DID.generateDID()
            return did
        },

        async preparePoPR(popr, vm, v, m) {
            popr.key_location = '/ipfs/' + vm.multihash;
            popr.vendor_did_id = v.publicDidDocument.id
            popr.marketplace_signature = await chluIpfs.did.signMultihash(vm.multihash, m.privateKeyBase58);
            popr.vendor_signature = await chluIpfs.did.signMultihash(vm.multihash, v.privateKeyBase58);
            return await chluIpfs.crypto.signPoPR(popr, vm.keyPair);
        },

        buildDIDMap(dids) {
            const map = {}
            for (const did of dids) {
                map[did.publicDidDocument.id] = did.publicDidDocument
            }
            if (chluIpfs.did.didId) {
                map[chluIpfs.did.didId] = chluIpfs.did.publicDidDocument
            }
            return map
        }
    };
};