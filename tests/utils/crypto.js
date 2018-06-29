const ChluDID = require('chlu-did/src')

module.exports = function cryptoTestUtils(chluIpfs) {
    return {
        async makeKeyPair() {
            return await chluIpfs.crypto.generateKeyPair()
        },

        async makeDID() {
            const DID = new ChluDID()
            const did = await DID.generateDID()
            return did
        },

        async preparePoPR(popr, vm, v, m) {
            popr.key_location = '/ipfs/' + vm.pubKeyMultihash;
            popr.vendor_did = v.publicDidDocument.id
            popr.marketplace_signature = await chluIpfs.did.signMultihash(vm.pubKeyMultihash, m);
            popr.vendor_signature = await chluIpfs.did.signMultihash(vm.pubKeyMultihash, v);
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