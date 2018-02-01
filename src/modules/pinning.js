const constants = require('../constants');

class Pinning {

    constructor(chluIpfs){
        this.chluIpfs = chluIpfs;
    }

    async pin(multihash){
        this.chluIpfs.utils.validateMultihash(multihash);
        // TODO: check that the multihash evaluates to valid Chlu data
        // broadcast start of pin process
        await this.chluIpfs.room.broadcast({ type: constants.eventTypes.pinning, multihash });
        try {
            if (this.chluIpfs.ipfs.pin) {
                await this.chluIpfs.ipfs.pin.add(multihash, { recursive: true });
            } else {
                // TODO: Chlu service node need to be able to pin, so we should support using go-ipfs
                this.chluIpfs.logger.warn('This node is running an IPFS client that does not implement pinning. Falling back to just retrieving the data non recursively. This will not be supported');
                await this.chluIpfs.ipfs.object.get(multihash);
            }
            // broadcast successful pin
            await this.chluIpfs.room.broadcast({ type: constants.eventTypes.pinned, multihash });
        } catch (error) {
            this.chluIpfs.logger.error('IPFS Pin Error: ' + error.message);
            return;
        }
    }
}

module.exports = Pinning;