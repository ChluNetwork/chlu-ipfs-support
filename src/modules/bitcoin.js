const Blockcypher = require('blockcypher');
const getOpReturn = require('chlu-wallet-support-js/lib/get_opreturn').default;
const IPFSUtils = require('../utils/ipfs');
const { isValidMultihash } = require('../utils/ipfs');
const { flatten, find } = require('lodash');
const protons = require('protons');
const protobuf = protons(require('../utils/protobuf'));

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
                if (!this.api) {
                    this.api = new this.Blockcypher('btc', this.options.network, this.options.apiKey);
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
        this.api = undefined;
    }

    async getTransactionInfo(txId) {
        const tx = await this.getTransaction(txId);
        this.chluIpfs.logger.debug('Preparing TX INFO for ' + txId);
        const opReturn = getOpReturn(tx);
        const multihash = opReturn.string || null;
        let isChlu = isValidMultihash(multihash);
        let chluInfo = null;
        if (isChlu) {
            try {
                chluInfo = await this.getChluInfo(multihash);
            } catch (error) {
                this.chluIpfs.logger.debug('Transaction ' + txId + ' contained multihash ' + multihash + ' but it was not valid Chlu data');
                console.log(error)
                console.trace(error)
                isChlu = false;
            }
        }
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
            multihash: multihash || null,
            fromAddress,
            outputs: isChlu ? this.demultiplexReviewRecords(outputs, chluInfo) : outputs,
            spentSatoshi,
            receivedAt: tx.received,
            confirmedAt: tx.confirmed
        };
        this.chluIpfs.logger.debug('Computed TX INFO for ' + txId + ' successfully');
        return txInfo;
    }

    async getChluInfo(multihash) {
        this.chluIpfs.logger.debug('Fetching Chlu TX Info from ' + multihash);
        const buffer = await this.chluIpfs.ipfsUtils.get(multihash);
        this.chluIpfs.logger.debug('Decoding Chlu TX Info from ' + multihash);
        const data = protobuf.Transaction.decode(buffer);
        this.chluIpfs.logger.debug('Decoded Chlu TX Info from ' + multihash);
        this.chluIpfs.logger.debug(JSON.stringify(data));
        return data;
    }

    demultiplexReviewRecords(outputs, chluInfo) {
        this.chluIpfs.logger.debug('Demultiplexing TX');
        return outputs.map((o, i) => {
            const ii = i + 1;
            this.chluIpfs.logger.debug('Demultiplexing ' + ii + '/' + outputs.length);
            const tx = find(chluInfo.outputs, t => t.index === o.index);
            if (tx && IPFSUtils.isValidMultihash(tx.multihash)) {
                this.chluIpfs.logger.debug('Found RR in ' + ii + '/' + outputs.length);
                return Object.assign({}, o, { multihash: tx.multihash || null });
            } else {
                this.chluIpfs.logger.debug('RR not found in ' + ii + '/' + outputs.length);
                return o;
            }
        });
    }

    async getTransaction(txId) {
        this.chluIpfs.logger.debug('Fetching TX From Blockcypher: ' + txId);
        const response = await new Promise((resolve, reject) => {
            this.api.getTX(txId, null, this.handleBlockcypherResponse(resolve, reject));
        });
        this.chluIpfs.logger.debug('Blockcypher returned the TX ' + txId + ' successfully');
        return response;
    }

    async getChain(checkAvailable = true) {
        return await new Promise((resolve, reject) => {
            this.api.getChain(this.handleBlockcypherResponse(resolve, reject, checkAvailable));
        });
    }

    async createTransactionOpReturn(outputs, publish = true) {
        const obj = {
            chlu_version: 0,
            outputs: outputs.map(o => {
                if (isNaN(o.index) || o.index < 0 || !IPFSUtils.isValidMultihash(o.multihash)) {
                    throw new Error('Invalid Transaction outputs');
                }
                return {
                    index: o.index,
                    multihash: o.multihash
                };
            })
        };
        const buffer = protobuf.Transaction.encode(obj); 
        const dagNode = await this.chluIpfs.ipfsUtils.createDAGNode(buffer);
        if (publish) {
            await this.chluIpfs.ipfsUtils.storeDAGNode(dagNode);
        }
        return IPFSUtils.getDAGNodeMultihash(dagNode);
    }

    isAvailable() {
        return this.options.enabled && Boolean(this.api) && this.ready;
    }

    getNetwork() {
        return this.options.network;
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
                    reject('Invalid response from BlockCypher');
                }
            };
        } else {
            reject('Blockchain access not available');
        }
    }
}

module.exports = Object.assign(Bitcoin, { networks });