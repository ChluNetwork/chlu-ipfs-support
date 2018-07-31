const expect = require('chai').expect;
const sinon = require('sinon');
const { cloneDeep } = require('lodash');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');
const utils = require('./utils/ipfs');
const env = require('../src/utils/env');

describe('ChluIPFS', () => {
    it('constructor does not crash', () => {
        new ChluIPFS();
    });

    it('chooses the network correctly', () => {
        const backupEnv = cloneDeep(process.env);
        let chluIpfs = new ChluIPFS({ network: 'mynet' });
        expect(chluIpfs.network).to.equal('mynet');
        chluIpfs = new ChluIPFS();
        expect(chluIpfs.network).to.equal('experimental');
        process.env.NODE_ENV = 'test';
        chluIpfs = new ChluIPFS();
        expect(chluIpfs.network).to.equal(ChluIPFS.networks.experimental);
        process.env.CHLU_NETWORK = 'mynet';
        chluIpfs = new ChluIPFS();
        expect(chluIpfs.network).to.equal('mynet');
        delete process.env.CHLU_NETWORK;
        process.env.NODE_ENV = 'production';
        chluIpfs = new ChluIPFS();
        expect(chluIpfs.network).to.equal('');
        // Restore env
        process.env = backupEnv;
    });

    it('starts and stops', async () => {
        let server;
        if (env.isNode()) {
            server = await require('../src/utils/rendezvous').startRendezvousServer(ChluIPFS.rendezvousPorts.test);
        }
        try {
            const testDir = '/tmp/chlu-test-' + Date.now() + Math.random() + '/startandstop';
            const chluIpfs = new ChluIPFS({
                enablePersistence: false,
                directory: testDir,
                logger: logger('Service'),
                network: ChluIPFS.networks.experimental,
                ipfs: {
                    config: {
                        Addresses: {
                            Swarm: [`/ip4/127.0.0.1/tcp/${ChluIPFS.rendezvousPorts.test}/ws/p2p-websocket-star`]
                        }
                    }
                }
            });
            // Dont connect it to blockcypher
            chluIpfs.bitcoin.start = sinon.stub().resolves();
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
});