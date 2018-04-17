const { cloneDeep } = require('lodash');
const debounce = require('debounce-async').default;
const LRU = require('lru-cache');
const IPFSUtils = require('../utils/ipfs');
const env = require('../utils/env');

class Cache {
    
    constructor(chluIpfs, options = {}) {
        this.chluIpfs = chluIpfs;
        this.log = this.chluIpfs.logger.debug;
        this.init(options);
    }

    isValidityCached(multihash) {
        IPFSUtils.validateMultihash(multihash);
        return this.read(multihash) === true;
    }

    cacheValidity(multihash) {
        IPFSUtils.validateMultihash(multihash);
        return this.write(multihash, true);
    }

    cacheBitcoinTxInfo(txInfo) {
        if (txInfo.hash) {
            return this.write(txInfo.hash, txInfo);
        } else {
            throw new Error('Cannot cache Transaction Info without Transaction Hash');
        }
    }

    getBitcoinTransactionInfo(txId) {
        return this.read(txId);
    }

    cacheMarketplacePubKeyMultihash(url, multihash) {
        IPFSUtils.validateMultihash(multihash);
        if (this.options.enabled) {
            this.cache.set(url, multihash, this.options.maxMarketplaceKeyAge);
            this.persistData();
            this.log('Cached ' + url + ' = ' + multihash + ' with maxAge ' + this.options.maxMarketplaceKeyAge);
        } else {
            this.log('Skipping cache write for ' + url + ' = ' + multihash + ': cache disabled');
        }
    }

    getMarketplacePubKeyMultihash(url) {
        if (this.options.enabled) {
            const val = this.cache.get(url);
            if (IPFSUtils.isValidMultihash(val)) {
                this.log('Cache HIT for ' + url + ': ' + val);
                return val;
            } else {
                this.log('Cache MISS for ' + url);
            }
        } else {
            this.log('Skipping cache read for ' + url + ': cache disabled');
        }
        return null;
    }

    export() {
        return {
            options: cloneDeep(this.options),
            data: this.cache.dump()
        };
    }

    import(exported) {
        this.init(exported.options);
        if (exported.data) this.cache.load(exported.data);
    }

    persistData() {
        this._persistData().catch(err => {
            if (err === 'canceled') {
                this.log('PersistData call from Cache has rejected due to too close cache writes');
            } else {
                // TODO: propagate error?
                this.log('PersistData call from Cache has rejected with an error: ' + (err.message || err));
            }
        });
    }

    init(options = {}) {
        const defaultOptions = {
            enabled: true,
            persistDelay: 1000,
            max: env.isNode() ? 1000 : 100,
            maxMarketplaceKeyAge: 3600 * 1000 // 1 hour
        };
        this.options = Object.assign({}, defaultOptions, options);
        this.cache = LRU(this.options);
        this._persistData = debounce(() => this.chluIpfs.persistence.persistData(), this.options.persistDelay);
    }

    read(key) {
        if (this.options.enabled) {
            const val = this.cache.get(key);
            if (val !== undefined) {
                this.log('Cache HIT for ' + key + ': ' + val);
                return val;
            } else {
                this.log('Cache MISS for ' + key);
            }
        } else {
            this.log('Skipping cache read for ' + key + ': cache disabled');
        }
        return undefined;
    }

    write(key, value, maxAge = null) {
        if (this.options.enabled) {
            this.cache.set(key, value, maxAge);
            this.persistData();
            this.log('Cached ' + key + ' = ' + value + (maxAge ? (' with maxAge ' + maxAge) : ''));
        } else {
            this.log('Skipping cache write for ' + key + ': cache disabled');
        }
    }

}

module.exports = Cache;