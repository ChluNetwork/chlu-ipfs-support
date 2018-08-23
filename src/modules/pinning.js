const constants = require('../constants');
const IPFSUtils = require('../utils/ipfs');
const { find, isEmpty } = require('lodash')

class Pinning {

    constructor(chluIpfs){
        this.chluIpfs = chluIpfs;
    }

    async pin(multihash, broadcast = true){
        IPFSUtils.validateMultihash(multihash);
        this.chluIpfs.logger.debug(`pin ${multihash} (broadcast: ${broadcast}) => ...`)
        // TODO: check that the multihash evaluates to valid Chlu data
        // broadcast start of pin process
        if (broadcast) await this.chluIpfs.room.broadcast({ type: constants.eventTypes.pinning, multihash });
        this.chluIpfs.events.emit('chlu-ipfs/pinning', multihash);
        try {
            await this.chluIpfs.ipfs.pin.add(multihash, { recursive: true });
            this.chluIpfs.events.emit('chlu-ipfs/pinned', multihash);
            // broadcast successful pin
            if (broadcast) await this.chluIpfs.room.broadcast({ type: constants.eventTypes.pinned, multihash });
            this.chluIpfs.logger.debug(`pin ${multihash} (broadcast: ${broadcast}) => OK`)
        } catch (error) {
            this.chluIpfs.logger.error(`pin ${multihash} (broadcast: ${broadcast}) => ERROR`)
            console.log(error)
            this.chluIpfs.events.emit('chlu-ipfs/pin/error', { multihash, error });
            this.chluIpfs.events.emit('chlu-ipfs/error', error);
        }
    }

    async isPinned(multihash) {
        IPFSUtils.validateMultihash(multihash)
        try {
            this.chluIpfs.logger.debug(`isPinned ${multihash} => ...`)
            const pinset = await this.chluIpfs.ipfs.pin.ls(multihash)
            const pinned = !isEmpty(find(pinset, {
                hash: multihash
            }))
            this.chluIpfs.logger.debug(`isPinned ${multihash} => OK ${pinned}`)
            return pinned
        } catch(error) {
            if (error.message === `Path ${multihash} is not pinned`) {
                // TODO: this is weird, why does ls not just return [] when data is not pinned?
                this.chluIpfs.logger.debug(`isPinned ${multihash} => OK false (due to "not pinned" error from IPFS)`)
                return false
            }
            this.chluIpfs.logger.error(`isPinned ${multihash} => ERROR`)
            throw error
        }
    }
}

module.exports = Pinning;