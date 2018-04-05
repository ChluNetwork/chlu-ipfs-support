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
            type: ChluIPFS.types.service,
            enablePersistence: false,
            // cache should be enabled by default
            logger: logger('Customer')
        });
        cache = chluIpfs.cache;
        sinon.spy(cache.cacheMarketplacePubKeyMultihash);
        sinon.spy(cache.cacheValidity);
        sinon.spy(cache.isValidityCached);
        sinon.spy(cache.getMarketplacePubKeyMultihash);
    });

    it('caches validation info correctly', () => {
        expect(cache.isValidityCached(genMultihash())).to.be.false;
        cache.cacheValidity(genMultihash());
        expect(cache.isValidityCached(genMultihash())).to.be.true;
    });

    it('caches marketplace pub key multihash correctly', () => {
        expect(cache.getMarketplacePubKeyMultihash(url)).to.be.null;
        cache.cacheMarketplacePubKeyMultihash(url, genMultihash());
        expect(cache.getMarketplacePubKeyMultihash(url)).to.equal(genMultihash());
    });

    it('does not cache when disabled', () => {
        cache.options.enabled = false;
        expect(cache.getMarketplacePubKeyMultihash(url)).to.be.null;
        cache.cacheMarketplacePubKeyMultihash(url, genMultihash());
        expect(cache.getMarketplacePubKeyMultihash(url)).to.be.null;
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