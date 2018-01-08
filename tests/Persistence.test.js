const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');

const directory = '/tmp/chlu-test-' + Date.now() + Math.random();

describe('Persistence', () => {
    it('saves and loads in this environment', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.customer, directory });
        const data = { hello: 'world' };
        await api.storage.save(api.directory, data, api.type);
        const loaded = await api.storage.load(api.directory, api.type);
        expect(loaded).to.deep.equal(data);
    });

    it('saves customer orbitdb address', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.customer, directory });
        const orbitDbAddress = 'fakeOrbitDBAddress';
        api.getOrbitDBAddress = sinon.stub().returns(orbitDbAddress);
        api.storage.save = sinon.stub().resolves();
        await api.persistData();
        const expected = { orbitDbAddress };
        expect(api.storage.save.calledWith(api.directory, expected, api.type)).to.be.true;
    });

    it('saves service node orbitdb addresses', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.service, directory });
        const dbs = {
            'fakeOrbitDBAddress1': { fakeDb: true, id: 1 },
            'fakeOrbitDBAddress2': { fakeDb: true, id: 2 },
            'fakeOrbitDBAddress3': { fakeDb: true, id: 3 }
        };
        const orbitDbAddresses = [ 'fakeOrbitDBAddress1', 'fakeOrbitDBAddress2', 'fakeOrbitDBAddress3' ];
        api.dbs = dbs;
        api.storage.save = sinon.stub().resolves();
        await api.persistData();
        const expected = { orbitDbAddresses };
        expect(api.storage.save.calledWith(api.directory, expected, api.type)).to.be.true;
    });

    it('saves the db address after it is opened for replication', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.service, directory });
        const address = 'fakeOrbitDBAddress';
        const expected = { orbitDbAddresses: [address] };
        api.storage.save = sinon.stub().resolves();
        api.openDb = sinon.stub().resolves({ fakeDb: true, id: 1 });
        await api.openDbForReplication(address);
        expect(api.storage.save.calledWith(api.directory, expected, api.type)).to.be.true;
    });

    it('loads customer orbitdb address', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.customer, directory });
        const data = { orbitDbAddress: 'fakeOrbitDbAddress' };
        const fakeDb = { address: 'fakeOrbitDbAddress', id: 1 };
        api.storage.load = sinon.stub().resolves(data);
        api.openDb = sinon.stub().resolves(fakeDb);
        await api.loadPersistedData();
        expect(api.storage.load.calledWith(api.directory, api.type)).to.be.true;
        expect(api.openDb.calledWith(fakeDb.address)).to.be.true;
        expect(api.db).to.deep.equal(fakeDb);
    });

    it('loads service node orbitdb addresses', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.service, directory });
        const fakeDb = { address: 'fakeOrbitDbAddress', id: 1 };
        const orbitDbAddresses = [ 'fakeOrbitDBAddress1', 'fakeOrbitDBAddress2', 'fakeOrbitDBAddress3' ];
        const data = { orbitDbAddresses };
        api.storage.load = sinon.stub().resolves(data);
        api.openDb = sinon.stub().resolves(fakeDb);
        await api.loadPersistedData();
        expect(api.storage.load.calledWith(api.directory, api.type)).to.be.true;
        expect(api.openDb.firstCall.calledWith(orbitDbAddresses[0])).to.be.true;
        expect(api.openDb.secondCall.calledWith(orbitDbAddresses[1])).to.be.true;
        expect(api.openDb.thirdCall.calledWith(orbitDbAddresses[2])).to.be.true;
        expect(Object.keys(api.dbs)).to.deep.equal(orbitDbAddresses);
    });
    
    it('skips loading if disabled', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.service, directory, enablePersistence: false });
        api.storage.load = sinon.stub().resolves({});
        await api.loadPersistedData();
        expect(api.storage.load.called).to.be.false;
    });
    
    it('skips saving if disabled', async () => {
        const api = new ChluIPFS({ type: ChluIPFS.types.service, directory, enablePersistence: false });
        api.storage.save = sinon.stub().resolves();
        await api.persistData();
        expect(api.storage.save.called).to.be.false;
    });
});