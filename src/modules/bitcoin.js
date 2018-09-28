const getOpReturn = require('chlu-wallet-support-js/lib/get_opreturn').default;
const { isValidMultihash } = require('../utils/ipfs');
const { flatten } = require('lodash');
const axios = require('axios')

const networks = ['test3', 'main'];

class BitcoinAPIClient {
    constructor(network = 'test3', apiKey = null) {
        this.network = network
        this.apiKey = apiKey
    }

    async getChain() {
        const response = await axios.get(`https://api.blockcypher.com/v1/btc/${this.network}`, {
            params: this.apiKey ? { token: this.apiKey } : undefined
        })
        return response.data
    }

    async getTX(txId) {
        const response = await axios.get(`https://api.blockcypher.com/v1/btc/${this.network}/txs/${txId}`, {
            params: this.apiKey ? { token: this.apiKey } : undefined
        })
        return response.data
    }
}

class Bitcoin {
    constructor(chluIpfs, options = {}) {
        this.chluIpfs = chluIpfs;
        this.BitcoinAPIClient = BitcoinAPIClient;
        this.options = {
            network: options.network || 'test3',
            apiKey: options.apiKey || null,
            enabled: options.enabled !== false
        };
        this.ready = false;
    }

    async start() {
        if (this.options.enabled) {
            if (networks.indexOf(this.options.network) < 0) {
                throw new Error('Invalid Bitcoin Network: ' + this.options.network);
            }
            try {
                if (!this.api) {
                    this.api = new this.BitcoinAPIClient(this.options.network, this.options.apiKey);
                }
                // Verify that it works
                const chain = await this.getChain(false);
                if (chain.name !== 'BTC.' + this.options.network) {
                    throw new Error('Invalid chain name response from BlockCypher');
                }
                this.ready = true;
                this.chluIpfs.logger.debug('Bitcoin Module started, connected to ' + chain.name);
            } catch (error) {
                this.chluIpfs.logger.warn('Failed to start Bitcoin module: ' + (error.message || error));
                this.ready = false;
            }
        }
    }

    async stop() {
        this.ready = false
    }

    async getTransactionInfo(txId) {
        const tx = await this.getTransaction(txId);
        // TODO: tx is undefined if the rate limit for Blockcypher was hit. Investigate this issue
        this.chluIpfs.logger.debug('Preparing TX INFO for ' + txId);
        const opReturn = getOpReturn(tx);
        const multihash = opReturn.string || null;
        const isChlu = isValidMultihash(multihash);
        const inputAddresses = flatten(tx.inputs.map(i => i.addresses));
        if (inputAddresses.length !== 1) {
            throw new Error('Expected 1 input address in Bitcoin transaction');
        }
        const fromAddress = inputAddresses[0];
        const outputs = tx.outputs
            .map((o, i) => {
                const toAddress = Array.isArray(o.addresses) && o.addresses.length === 1 ? o.addresses[0] : null;
                return {
                    index: i,
                    toAddress,
                    value: o.value
                };
            })
            .filter(o => typeof o.toAddress === 'string' && o.toAddress !== fromAddress);
        const spentSatoshi = outputs.reduce((acc, o) => acc + o.value, 0);
        const txInfo = {
            hash: tx.hash,
            doubleSpend: tx.double_spend,
            confirmations: tx.confirmations,
            isChlu,
            multihash: isChlu ? multihash : null,
            fromAddress,
            outputs,
            spentSatoshi,
            receivedAt: tx.received,
            confirmedAt: tx.confirmed
        };
        this.chluIpfs.logger.debug('Computed TX INFO for ' + txId + ' successfully');
        return txInfo;
    }

    async getTransaction(txId) {
        this.chluIpfs.logger.debug('Fetching TX From Blockcypher: ' + txId);
        const response = await this.api.getTX(txId)
        this.chluIpfs.logger.debug('Blockcypher returned the TX ' + txId + ' successfully');
        return response
    }

    async getChain() {
        return await this.api.getChain()
    }

    isAvailable() {
        return this.options.enabled && Boolean(this.api) && this.ready;
    }

    getNetwork() {
        return this.options.network;
    }

}

module.exports = Object.assign(Bitcoin, { networks });