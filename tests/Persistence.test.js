const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');
const ipfsUtilsStub = require('./utils/ipfsUtilsStub');
const { ECPair } = require('bitcoinjs-lib');

const directory = '/tmp/chlu-test-' + Date.now() + Math.random();

describe('Persistence module', () => {

    let api;

    beforeEach(() => {
        api = new ChluIPFS({
            type: ChluIPFS.types.customer,
            directory,
            logger: logger('Customer')
        });
    });

    it('saves and loads in this environment', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.customer, directory, logger: logger('Customer') });
        const data = { hello: 'world' };
        await api.storage.save(api.directory, data, api.type);
        const loaded = await api.storage.load(api.directory, api.type);
        expect(loaded).to.deep.equal(data);
    });

    it('saves customer key pair', async () => {
        const fakeStore = {};
        api.ipfsUtils = ipfsUtilsStub(fakeStore);
        const keyPair = await api.crypto.generateKeyPair();
        await api.crypto.exportKeyPair();
        api.storage.save = sinon.stub().resolves();
        await api.persistence.persistData();
        expect(api.storage.save.args[0][1].keyPair).to.equal(keyPair.toWIF());
    });

    it('saves customer last review record multihash', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.customer, directory, logger: logger('Customer') });
        const lastReviewRecordMultihash = 'QmWBTzAwP8fz2zRsmzqUfSKEZ6GRTuPTsBVfJs6Y72D1hz'; // valid but not real
        api.lastReviewRecordMultihash = lastReviewRecordMultihash; 
        api.storage.save = sinon.stub().resolves();
        await api.persistence.persistData();
        expect(api.storage.save.args[0][1].lastReviewRecordMultihash).to.equal(lastReviewRecordMultihash);
    });

    it('loads customer keypair', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.customer, directory, logger: logger('Customer') });
        const keyPair = ECPair.makeRandom();
        const data = { keyPair: keyPair.toWIF() };
        api.storage.load = sinon.stub().resolves(data);
        api.crypto.importKeyPair = sinon.stub().resolves();
        await api.persistence.loadPersistedData();
        expect(api.storage.load.calledWith(api.directory, api.type)).to.be.true;
        expect(api.crypto.importKeyPair.calledWith(keyPair.toWIF())).to.be.true;
    });

    it('loads customer last review record multihash', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.customer, directory, logger: logger('Customer') });
        const data = { lastReviewRecordMultihash: 'QmWBTzAwP8fz2zRsmzqUfSKEZ6GRTuPTsBVfJs6Y72D1hz' };
        api.storage.load = sinon.stub().resolves(data);
        await api.persistence.loadPersistedData();
        expect(api.storage.load.calledWith(api.directory, api.type)).to.be.true;
        expect(api.lastReviewRecordMultihash).to.deep.equal(data.lastReviewRecordMultihash);
    });
    
    it('skips loading if disabled', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.service, directory, enablePersistence: false, logger: logger('Service') });
        api.storage.load = sinon.stub().resolves({});
        await api.persistence.loadPersistedData();
        expect(api.storage.load.called).to.be.false;
    });
    
    it('skips saving if disabled', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.service, directory, enablePersistence: false, logger: logger('Service') });
        api.storage.save = sinon.stub().resolves();
        await api.persistence.persistData();
        expect(api.storage.save.called).to.be.false;
    });
});