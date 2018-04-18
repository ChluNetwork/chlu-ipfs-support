const Blockcypher = require('blockcypher');
const getOpReturn = require('chlu-wallet-support-js/lib/get_opreturn').default;
const { isValidMultihash } = require('../utils/ipfs');

const networks = ['test3', 'main'];

class Bitcoin {
    constructor(chluIpfs, options = {}) {
        this.chluIpfs = chluIpfs;
        this.Blockcypher = Blockcypher;
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
                this.api = new this.Blockcypher('btc', this.options.network, this.options.apiKey);
                // Verify that it works
                const chain = await this.getChain(false);
                if (chain.name !== 'BTC.' + this.options.network) {
                    throw new Error('Invalid chain name response from BlockCypher');
                }
                this.ready = true;
            } catch (error) {
                this.chluIpfs.logger.error('Failed to start Bitcoin module');
                console.trace(error);
                this.api = undefined;
                this.ready = false;
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
            sentTo: out.addresses && out.addresses.length === 1 ? out.addresses[0] : null,
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
        return await new Promise((resolve, reject) => {
            this.api.getTX(txId, null, this.handleBlockcypherResponse(resolve, reject));
        });
    }

    async getChain(checkAvailable = true) {
        return await new Promise((resolve, reject) => {
            this.api.getChain(this.handleBlockcypherResponse(resolve, reject, checkAvailable));
        });
    }

    isAvailable() {
        return this.options.enabled && Boolean(this.api) && this.ready;
    }

    handleBlockcypherResponse(resolve, reject, checkAvailable = true) {
        if (!checkAvailable || this.isAvailable()) {
            return (err, data) => {
                if (err) {
                    reject(err);
                } else if (data) {
                    if (data.error) {
                        reject(data.error);
                    } else {
                        resolve(data);
                    }
                } else {
                    console.log(err, data)
                    reject('Invalid response from BlockCypher');
                }
            };
        } else {
            reject('Blockchain access not available');
        }
    }
}

module.exports = Object.assign(Bitcoin, { networks });