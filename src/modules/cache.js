const { cloneDeep } = require('lodash');
const LRU = require('lru-cache');
const IPFSUtils = require('../utils/ipfs');

const defaultOptions = {
    enabled: true,
    max: 100,
    maxMarketplaceKeyAge: 3600 * 1000 // 1 hour
};
        

class Cache {
    
    constructor(chluIpfs, options = {}) {
        this.chluIpfs = chluIpfs;
        this.options = Object.assign({}, defaultOptions, options);
        this.cache = LRU(this.options);
        this.log = this.chluIpfs.logger.debug;
    }

    isValidityCached(multihash) {
        IPFSUtils.validateMultihash(multihash);
        if (this.options.enabled) {
            this.log('Reading cache for ' + multihash);
            // only return true if the value in cache was specifically true
            const val = this.cache.get(multihash) === true;
            if (val) {
                this.log('Cache HIT for ' + multihash);
                return true;
            } else {
                this.log('Cache MISS for ' + multihash);
            }
        } else {
            this.log('Skipping cache read for ' + multihash + ': cache disabled');
        }
        return false;
    }

    cacheValidity(multihash) {
        IPFSUtils.validateMultihash(multihash);
        if (this.options.enabled) {
            this.cache.set(multihash, true);
            this.log('Cached ' + multihash + ' validity');
        } else {
            this.log('Skipping cache write for ' + multihash + ': cache disabled');
        }
    }

    cacheMarketplacePubKeyMultihash(url, multihash) {
        IPFSUtils.validateMultihash(multihash);
        if (this.options.enabled) {
            this.cache.set(url, multihash, this.options.maxMarketplaceKeyAge);
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
        if (exported.data) this.cache.load(exported.data);
    }

}

module.exports = Cache;