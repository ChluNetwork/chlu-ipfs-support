const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');
const { genMultihash } = require('./utils/ipfs');
const ChluDID = require('chlu-did/src');

const directory = '/tmp/chlu-test-' + Date.now() + Math.random();

describe('Persistence module', () => {

    let api;

    beforeEach(() => {
        api = new ChluIPFS({
            directory,
            logger: logger('Customer')
        });
    });

    it('saves and loads in this environment', async () => {
        const data = { hello: 'world' };
        await api.storage.save(api.directory, data, api.type);
        const loaded = await api.storage.load(api.directory, api.type);
        expect(loaded).to.deep.equal(data);
    });

    it('saves DID', async () => {
        api.didIpfsHelper.publish = sinon.stub().resolves()
        await api.didIpfsHelper.generate();
        const publicDidDocument = api.didIpfsHelper.publicDidDocument
        const privateKeyBase58 = api.didIpfsHelper.privateKeyBase58
        api.storage.save = sinon.stub().resolves();
        await api.persistence.persistData();
        expect(api.storage.save.args[0][1].did).to.deep.equal({ publicDidDocument, privateKeyBase58 });
    });

    it('saves customer last review record multihash', async () => {
        const lastReviewRecordMultihash = 'QmWBTzAwP8fz2zRsmzqUfSKEZ6GRTuPTsBVfJs6Y72D1hz'; // valid but not real
        api.lastReviewRecordMultihash = lastReviewRecordMultihash; 
        api.storage.save = sinon.stub().resolves();
        await api.persistence.persistData();
        expect(api.storage.save.args[0][1].lastReviewRecordMultihash).to.equal(lastReviewRecordMultihash);
    });

    it('saves cache', async () => {
        api.cache.cacheValidity(genMultihash()); 
        api.storage.save = sinon.stub().resolves();
        await api.persistence.persistData();
        expect(api.storage.save.args[0][1].cache).to.deep.equal(api.cache.export());
    });

    it('loads cache', async () => {
        api.cache.cacheValidity(genMultihash()); 
        const data = { cache: api.cache.export() };
        api.cache.cache.reset();
        sinon.spy(api.cache, 'import');
        api.storage.load = sinon.stub().resolves(data);
        await api.persistence.loadPersistedData();
        expect(api.storage.load.calledWith(api.directory)).to.be.true;
        expect(api.cache.import.calledWith(data.cache)).to.be.true;
        expect(data.cache).to.deep.equal(api.cache.export());
    });

    it('loads DID', async () => {
        const DID = new ChluDID()
        const did = await DID.generateDID()
        const data = { did };
        api.storage.load = sinon.stub().resolves(data);
        api.didIpfsHelper.import = sinon.stub().resolves()
        await api.persistence.loadPersistedData();
        expect(api.storage.load.calledWith(api.directory)).to.be.true;
        expect(api.didIpfsHelper.import.calledWith(did)).to.be.true;
    });

    it('loads customer last review record multihash', async () => {
        const data = { lastReviewRecordMultihash: 'QmWBTzAwP8fz2zRsmzqUfSKEZ6GRTuPTsBVfJs6Y72D1hz' };
        api.storage.load = sinon.stub().resolves(data);
        await api.persistence.loadPersistedData();
        expect(api.storage.load.calledWith(api.directory)).to.be.true;
        expect(api.lastReviewRecordMultihash).to.deep.equal(data.lastReviewRecordMultihash);
    });
    
    it('skips loading if disabled', async () => {
        api = new ChluIPFS({
            directory,
            logger: logger('Customer'),
            cache: { enabled: false },
            enablePersistence: false
        });
        api.storage.load = sinon.stub().resolves({});
        await api.persistence.loadPersistedData();
        expect(api.storage.load.called).to.be.false;
    });
    
    it('skips saving if disabled', async () => {
        api = new ChluIPFS({
            directory,
            logger: logger('Customer'),
            cache: { enabled: false },
            enablePersistence: false
        });
        api.storage.save = sinon.stub().resolves();
        await api.persistence.persistData();
        expect(api.storage.save.called).to.be.false;
    });
});