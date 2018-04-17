const Blockcypher = require('blockcypher');
const getOpReturn = require('chlu-wallet-support-js/lib/get_opreturn');
const { isValidMultihash } = require('../utils/ipfs');

const networks = ['test3', 'main'];

class Bitcoin {
    constructor(chluIpfs, options = {}) {
        this.chluIpfs = chluIpfs;
        this.options = Object.assign({}, {
            network: 'test3',
            apiKey: null,
            enabled: true
        }, options);
    }

    async start() {
        if (this.options.enable) {
            if (networks.indexOf(this.options.network) < 0) {
                throw new Error('Invalid Bitcoin Network');
            }
            try {
                const api = new Blockcypher('btc', this.options.network, this.options.apiKey);
                // Verify that it works
                const chain = await this.getChain();
                if (chain.name !== 'BTC.' + this.options.network.toUpperCase()) {
                    throw new Error('Invalid response from BlockCypher');
                }
                this.api = api;
            } catch (error) {
                // TODO: better error handling
                console.trace(error);
                // Make sure to delete ref to api to signal that it's not available
                this.api = undefined;
            }
        }
    }

    async stop() {
        this.api = undefined;
    }

    async getTransactionInfo(txId) {
        const tx = await this.getTransaction(txId);
        const opReturn = getOpReturn(tx);
        const multihash = opReturn.string || null;
        const isChlu = isValidMultihash(multihash);
        const outputs = tx.outputs.map(out => ({
            sentTo: out.addresses.length === 1 ? out.addresses[0] : out.addresses,
            amountSatoshi: out.value
        }));
        return {
            hash: tx.hash,
            valid: !tx.doubleSpend,
            confirmations: tx.confirmations,
            isChlu,
            multihash: isChlu ? multihash : null,
            outputs,
            amountSatoshi: tx.value,
            receivedAt: tx.received,
            confirmedAt: tx.confirmed
        };
    }

    async getTransaction(txId) {
        if (this.isAvailable()) {
            try {
                return await new Promise((resolve, reject) => {
                    this.api.getTX(txId, null, (err, data) => err ? reject(err) : resolve(data));
                });
            } catch (error) {
                console.trace(error);
                throw new Error('Fetching Bitcoin Transaction failed: ' + (err.message || err));
            }
        } else {
            throw new Error('Blockchain access not available');
        }
    }

    async getChain() {
        return await new Promise((resolve, reject) => {
            this.api.getChain((err, data) => err ? reject(err) : resolve(data));
        });
    }

    isAvailable() {
        return this.options.enabled && Boolean(this.api);
    }
}

module.exports = Object.assign(Bitcoin, { networks });