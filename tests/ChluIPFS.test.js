const expect = require('chai').expect;
const sinon = require('sinon');
const { cloneDeep } = require('lodash');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');
const utils = require('./utils/ipfs');
const env = require('../src/utils/env');

describe('ChluIPFS', () => {
    it('constructor', () => {
        let type = ChluIPFS.types.customer;
        let chluIpfs = new ChluIPFS({ type });
        expect(chluIpfs.type).to.equal(type);
        type = ChluIPFS.types.vendor;
        chluIpfs = new ChluIPFS({ type });
        expect(chluIpfs.type).to.equal(type);
        type = ChluIPFS.types.marketplace;
        chluIpfs = new ChluIPFS({ type });
        expect(chluIpfs.type).to.equal(type);
        type = 'anything else';
        expect(() => new ChluIPFS({ type })).to.throw();
    });

    it('chooses the network correctly', () => {
        const backupEnv = cloneDeep(process.env);
        let chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, network: 'mynet' });
        expect(chluIpfs.network).to.equal('mynet');
        chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer });
        expect(chluIpfs.network).to.equal('experimental');
        process.env.NODE_ENV = 'test';
        chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer });
        expect(chluIpfs.network).to.equal(ChluIPFS.networks.experimental);
        process.env.CHLU_NETWORK = 'mynet';
        chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer });
        expect(chluIpfs.network).to.equal('mynet');
        delete process.env.CHLU_NETWORK;
        process.env.NODE_ENV = 'production';
        chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer });
        expect(chluIpfs.network).to.equal('');
        // Restore env
        process.env = backupEnv;
    });

    it('exportData', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer });
        chluIpfs.db = {
            keystore: {
                exportPublicKey: () => 'examplePublicKey',
                exportPrivateKey: () => 'examplePrivateKey'
            }
        };
        const exported = await chluIpfs.exportData();
        expect(exported.customerDbKeys).to.deep.equal({
            pub: 'examplePublicKey',
            priv: 'examplePrivateKey'
        });
    });

    it('starts and stops', async () => {
        let server;
        if (env.isNode()) {
            server = await require('./utils/nodejs').startRendezvousServer();
        }
        try {
            const testDir = '/tmp/chlu-test-' + Date.now() + Math.random() + '/startandstop';
            const chluIpfs = new ChluIPFS({
                type: ChluIPFS.types.service,
                enablePersistence: false,
                directory: testDir,
                logger: logger('Service'),
                network: ChluIPFS.networks.experimental,
                useRendezvous: false
            });
            // Make sure it doesnt get stuck waiting for peers
            chluIpfs.room.waitForAnyPeer = sinon.stub().resolves();
            // Make sure to not use the production network
            expect(chluIpfs.network).to.equal(ChluIPFS.networks.experimental);
            // Use the test IPFS configuration to avoid depending on an internet connection
            chluIpfs.ipfs = await utils.createIPFS();
            await chluIpfs.start();
            expect(chluIpfs.ipfs).to.not.be.undefined;
            await chluIpfs.stop();
            expect(chluIpfs.ipfs).to.be.undefined;

        } catch (error) {
            if (env.isNode()) await server.stop();
            throw error;
        }
        if (env.isNode()) await server.stop();
    });

    it('switches type correctly from service node', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.service, enablePersistence: false, logger: logger('Service') });
        const fakeDb = {
            close: sinon.stub().resolves()
        };
        chluIpfs.dbs = {
            first: fakeDb
        };
        sinon.spy(chluIpfs.events, 'removeListener');
        chluIpfs.serviceNodeRoomMessageListener = 'test';
        expect(chluIpfs.type).to.equal(ChluIPFS.types.service);
        await chluIpfs.switchType(ChluIPFS.types.customer);
        expect(chluIpfs.type).to.equal(ChluIPFS.types.customer);
        expect(chluIpfs.dbs).to.deep.equal({});
        expect(fakeDb.close.called).to.be.true;
        expect(chluIpfs.events.removeListener.calledWith('message', chluIpfs.serviceNodeRoomMessageListener));
    });

    it('switches type correctly from customer', async () => {
        const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false, logger: logger('Customer') });
        const fakeDb = {
            close: sinon.stub().resolves()
        };
        chluIpfs.db = fakeDb;
        expect(chluIpfs.type).to.equal(ChluIPFS.types.customer);
        await chluIpfs.switchType(ChluIPFS.types.vendor);
        expect(chluIpfs.type).to.equal(ChluIPFS.types.vendor);
        expect(chluIpfs.db).to.be.undefined;
        expect(fakeDb.close.called).to.be.true;
    });
});