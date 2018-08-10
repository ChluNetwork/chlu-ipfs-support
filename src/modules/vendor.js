const { get } = require('lodash')
const { get: httpGET, post: httpPOST } = require('../utils/http')
const { createDAGNode, getDAGNodeMultihash } = require('../utils/ipfs')

class Vendor {
    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs
    }

    async registerToMarketplace(url, profile = null) {
        const didId = this.chluIpfs.didIpfsHelper.didId
        this.chluIpfs.logger.debug(`Registering as Vendor to ${url} using DID ${didId}`)
        // check Marketplace Chlu Network
        const info = await this.getInfo(url)
        const mktNetwork = get(info, 'data.network', null)
        if (mktNetwork !== this.chluIpfs.network) {
            throw new Error(`Expected Marketplace to run on Chlu Network ${this.chluIpfs.network}, found ${mktNetwork} instead`)
        }
        // Step 0: Make sure DID is published
        await this.chluIpfs.didIpfsHelper.publish()
        // Step 1: Register Vendor
        const response = await this.getVendorData(url, didId)
        let vendorData = null
        if (get(response, 'data.vDidId', null) === didId) {
            // Already exists
            vendorData = response.data
            this.chluIpfs.logger.debug('Vendor already registered')
        } else  {
            // Need to register
            this.chluIpfs.logger.debug('HTTP ===> Register Request for ' + didId)
            const response = await this.signup(url, didId)
            this.chluIpfs.logger.debug('<=== HTTP Response:\n' + JSON.stringify(response.data, null, 2))
            vendorData = response.data;
        }
        // Step 2: Submit signature
        if (!vendorData.vSignature) {
            const vmPubKeyMultihash = vendorData.vmPubKeyMultihash
            this.chluIpfs.logger.debug(`Sending Vendor Signature for ${vmPubKeyMultihash}, profile: ${JSON.stringify(profile)}`)
            const signature = await this.chluIpfs.didIpfsHelper.signMultihash(vmPubKeyMultihash);
            await this.sendSignature(url, didId, signature, profile)
        } else {
            this.chluIpfs.logger.debug('Marketplace/Vendor key already signed')
        }
        // Step 3: (Optional) Submit Profile
        if(profile) await this.updateProfile(url, profile)
        this.chluIpfs.logger.debug('Vendor Signup complete')
    }

    async updateProfile(url, profile = null) {
        const didId = this.chluIpfs.didIpfsHelper.didId
        this.chluIpfs.logger.debug(`Updating Vendor Profile for Marketplace ${url} using DID ${didId}`)
        const multihash = getDAGNodeMultihash(await createDAGNode(Buffer.from(JSON.stringify(profile))))
        const signature = await this.chluIpfs.didIpfsHelper.signMultihash(multihash);
        await this.sendProfile(url, didId, profile, signature)
        this.chluIpfs.logger.debug(`Updating Vendor Profile for Marketplace ${url} using DID ${didId} updated`)
    }

    async sendProfile(url, didId, profile, signature) {
        return await httpPOST(`${url}/vendors/${didId}/profile`, { profile, signature })
    }

    async getInfo(url) {
        return await httpGET(`${url}/.well-known`)
    }

    async getVendorData(url, didId) {
        try {
            return await httpGET(`${url}/vendors/${didId}`)
        } catch (error) {
            return { data: {} }
        }
    }

    async signup(url, didId) {
        return await httpPOST(`${url}/vendors`, { didId });
    }

    async sendSignature(url, didId, signature, profile = null) {
        const body = profile ? { signature, profile } : { signature }
        return await httpPOST(`${url}/vendors/${didId}/signature`, body);
    }
}

module.exports = Vendor