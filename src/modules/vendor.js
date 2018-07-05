const { get } = require('lodash')
const { get: httpGET, post: httpPOST } = require('../utils/http')

class Vendor {
    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs
    }

    async registerToMarketplace(url) {
        const didId = this.chluIpfs.did.didId
        this.chluIpfs.logger.debug(`Registering as Vendor to ${url} using DID ${didId}`)
        // check Marketplace Chlu Network
        const info = await this.getInfo(url)
        const mktNetwork = get(info, 'data.network', null)
        if (mktNetwork !== this.chluIpfs.network) {
            throw new Error(`Expected Marketplace to run on Chlu Network ${this.chluIpfs.network}, found ${mktNetwork} instead`)
        }
        // Step 0: Make sure DID is published
        await this.chluIpfs.did.publish()
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
            this.chluIpfs.logger.debug(`Sending Vendor Signature for ${vmPubKeyMultihash}`)
            const signature = await this.chluIpfs.did.signMultihash(vmPubKeyMultihash);
            await this.sendSignature(url, didId, signature)
        } else {
            this.chluIpfs.logger.debug('Marketplace/Vendor key already signed')
        }
        this.chluIpfs.logger.debug('Vendor Signup complete')
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

    async sendSignature(url, didId, signature) {
        return await httpPOST(`${url}/vendors/${didId}/signature`, { signature });
    }
}

module.exports = Vendor