const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');

const directory = '/tmp/chlu-test-' + Date.now() + Math.random();

describe('Persistence module', () => {
    it('saves and loads in this environment', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.customer, directory, logger: logger('Customer') });
        const data = { hello: 'world' };
        await api.storage.save(api.directory, data, api.type);
        const loaded = await api.storage.load(api.directory, api.type);
        expect(loaded).to.deep.equal(data);
    });

    it('saves customer orbitdb address', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.customer, directory, logger: logger('Customer') });
        const orbitDbAddress = 'fakeOrbitDBAddress';
        api.getOrbitDBAddress = sinon.stub().returns(orbitDbAddress);
        api.storage.save = sinon.stub().resolves();
        await api.persistence.persistData();
        expect(api.storage.save.args[0][1].orbitDbAddress === orbitDbAddress).to.be.true;
    });

    it('saves customer last review record multihash', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.customer, directory, logger: logger('Customer') });
        const lastReviewRecordMultihash = 'example data';
        api.lastReviewRecordMultihash = lastReviewRecordMultihash; 
        api.storage.save = sinon.stub().resolves();
        await api.persistence.persistData();
        expect(api.storage.save.args[0][1].lastReviewRecordMultihash === lastReviewRecordMultihash).to.be.true;
    });

    it('saves service node orbitdb addresses', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.service, directory , logger: logger('Service')});
        const dbs = {
            'fakeOrbitDBAddress1': { fakeDb: true, id: 1 },
            'fakeOrbitDBAddress2': { fakeDb: true, id: 2 },
            'fakeOrbitDBAddress3': { fakeDb: true, id: 3 }
        };
        const orbitDbAddresses = [ 'fakeOrbitDBAddress1', 'fakeOrbitDBAddress2', 'fakeOrbitDBAddress3' ];
        api.orbitDb.dbs = dbs;
        api.storage.save = sinon.stub().resolves();
        await api.persistence.persistData();
        const expected = { orbitDbAddresses };
        expect(api.storage.save.calledWith(api.directory, expected, api.type)).to.be.true;
    });

    it('saves the db address after it is opened for replication', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.service, directory, logger: logger('Service') });
        const address = 'fakeOrbitDBAddress';
        const expected = { orbitDbAddresses: [address] };
        api.storage.save = sinon.stub().resolves();
        api.orbitDb.openDb = sinon.stub().resolves({ fakeDb: true, id: 1 });
        await api.orbitDb.openDbForReplication(address);
        expect(api.storage.save.calledWith(api.directory, expected, api.type)).to.be.true;
    });

    it('loads customer orbitdb address', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.customer, directory, logger: logger('Customer') });
        const data = { orbitDbAddress: 'fakeOrbitDbAddress' };
        const fakeDb = { address: 'fakeOrbitDbAddress', id: 1 };
        api.storage.load = sinon.stub().resolves(data);
        api.orbitDb.openDb = sinon.stub().resolves(fakeDb);
        await api.persistence.loadPersistedData();
        expect(api.storage.load.calledWith(api.directory, api.type)).to.be.true;
        expect(api.orbitDb.openDb.calledWith(fakeDb.address)).to.be.true;
        expect(api.orbitDb.db).to.deep.equal(fakeDb);
    });

    it('loads customer last review record multihash', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.customer, directory, logger: logger('Customer') });
        const data = { lastReviewRecordMultihash: 'example data' };
        api.storage.load = sinon.stub().resolves(data);
        await api.persistence.loadPersistedData();
        expect(api.storage.load.calledWith(api.directory, api.type)).to.be.true;
        expect(api.lastReviewRecordMultihash).to.deep.equal(data.lastReviewRecordMultihash);
    });

    it('loads service node orbitdb addresses', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.service, directory, logger: logger('Service') });
        const fakeDb = { address: 'fakeOrbitDbAddress', id: 1 };
        const orbitDbAddresses = [ 'fakeOrbitDBAddress1', 'fakeOrbitDBAddress2', 'fakeOrbitDBAddress3' ];
        const data = { orbitDbAddresses };
        api.storage.load = sinon.stub().resolves(data);
        api.orbitDb.openDb = sinon.stub().resolves(fakeDb);
        await api.persistence.loadPersistedData();
        expect(api.storage.load.calledWith(api.directory, api.type)).to.be.true;
        expect(api.orbitDb.openDb.firstCall.calledWith(orbitDbAddresses[0])).to.be.true;
        expect(api.orbitDb.openDb.secondCall.calledWith(orbitDbAddresses[1])).to.be.true;
        expect(api.orbitDb.openDb.thirdCall.calledWith(orbitDbAddresses[2])).to.be.true;
        expect(Object.keys(api.orbitDb.dbs)).to.deep.equal(orbitDbAddresses);
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