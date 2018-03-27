const constants = require('../constants');
const IPFSUtils = require('../utils/ipfs');

class Pinning {

    constructor(chluIpfs){
        this.chluIpfs = chluIpfs;
    }

    async pin(multihash){
        IPFSUtils.validateMultihash(multihash);
        // TODO: check that the multihash evaluates to valid Chlu data
        // broadcast start of pin process
        await this.chluIpfs.room.broadcast({ type: constants.eventTypes.pinning, multihash });
        this.chluIpfs.events.emit('pinning', multihash);
        try {
            if (this.chluIpfs.ipfs.pin) {
                await this.chluIpfs.ipfs.pin.add(multihash, { recursive: true });
            } else {
                // TODO: Chlu service node need to be able to pin, so we should support using go-ipfs
                await this.chluIpfs.ipfsUtils.get(multihash);
            }
            this.chluIpfs.events.emit('pinned', multihash);
            // broadcast successful pin
            await this.chluIpfs.room.broadcast({ type: constants.eventTypes.pinned, multihash });
        } catch (error) {
            this.chluIpfs.logger.error('IPFS Pin Error: ' + error.message);
            this.chluIpfs.events.emit('pin error', { multihash, error });
            this.chluIpfs.events.emit('error', error);
        }
    }
}

module.exports = Pinning;