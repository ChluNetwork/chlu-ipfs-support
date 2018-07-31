const expect = require('chai').expect;
const sinon = require('sinon');
const { cloneDeep } = require('lodash');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');
const { genMultihash } = require('./utils/ipfs');

const url = 'chlu.io';

describe('Cache Module', () => {
    let chluIpfs, cache;

    beforeEach(() => {
        chluIpfs = new ChluIPFS({
            enablePersistence: false,
            // cache should be enabled by default
            cache: {
                // do not delay writes to storage to speed up tests
                // that check if storage has been written
                persistDelay: 0 
            },
            logger: logger('Customer')
        });
        cache = chluIpfs.cache;
        sinon.spy(cache, 'persistData');
    });

    it('caches validation info correctly', () => {
        expect(cache.isValidityCached(genMultihash())).to.be.false;
        cache.cacheValidity(genMultihash());
        expect(cache.isValidityCached(genMultihash())).to.be.true;
        expect(cache.persistData.called).to.be.true;
    });

    it('caches marketplace pub key multihash correctly', () => {
        expect(cache.getMarketplaceDIDID(url)).to.be.null;
        cache.cacheMarketplaceDIDID(url, genMultihash());
        expect(cache.getMarketplaceDIDID(url)).to.equal(genMultihash());
        expect(cache.persistData.called).to.be.true;
    });

    it('does not cache when disabled', () => {
        cache.options.enabled = false;
        expect(cache.getMarketplaceDIDID(url)).to.be.null;
        cache.cacheMarketplaceDIDID(url, genMultihash());
        expect(cache.getMarketplaceDIDID(url)).to.be.null;
        expect(cache.isValidityCached(genMultihash())).to.be.false;
        cache.cacheValidity(genMultihash());
        expect(cache.isValidityCached(genMultihash())).to.be.false;
    });

    it('exports and then imports back correctly', () => {
        // write some stuff
        cache.cacheValidity(genMultihash(1));
        cache.cacheValidity(genMultihash(2));
        cache.cacheValidity(genMultihash(3));
        expect(cache.isValidityCached(genMultihash())).to.be.true;
        // export
        const exported = cache.export();
        const settings = cloneDeep(cache.options);
        // clear
        cache.cache.reset();
        expect(cache.isValidityCached(genMultihash())).to.be.false;
        // import
        cache.options = { a: 'b' };
        cache.import(exported);
        expect(cache.isValidityCached(genMultihash())).to.be.true;
        expect(cache.options).to.deep.equal(settings);
    });

});