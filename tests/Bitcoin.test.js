const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');

const exampleTransaction = require('./utils/bitcoin/chlu_transaction_example.json');

describe('Bitcoin Module', () => {
    let chluIpfs;

    const bitcoinNetwork = 'test3';
    const blockCypherApiKey = 'fakekey';

    beforeEach(() => {
        chluIpfs = new ChluIPFS({
            type: ChluIPFS.types.vendor,
            enablePersistence: false,
            cache: { enabled: false },
            logger: logger('Service'),
            bitcoinNetwork,
            blockCypherApiKey
        });
        // mock blockcypher
        chluIpfs.bitcoin.Blockcypher = class BlockcypherMock {
            constructor(...args) {
                this.args = args;
                this.getChain = sinon.stub().yields(null, { name: 'BTC.test3' });
                this.getTX = sinon.stub().yields(null, exampleTransaction)
            }
        };
    });
    
    it('passes options correctly', async () => {
        expect(chluIpfs.bitcoin.options).to.deep.equal({
            enabled: true,
            network: bitcoinNetwork,
            apiKey: blockCypherApiKey
        });
        await chluIpfs.bitcoin.start();
        expect(chluIpfs.bitcoin.api.args).to.deep.equal([
            'btc', bitcoinNetwork, blockCypherApiKey
        ]);
    });

    it('fails if the network is invalid', async () => {
        let error;
        chluIpfs.bitcoin.getChain = sinon.stub().resolves({ name: 'BTC.wrong' });
        chluIpfs.bitcoin.options.network = 'wrong';
        try {
            await chluIpfs.bitcoin.start();
        } catch (err) {
            error = err;
        }
        expect(error).to.not.be.undefined;
        chluIpfs.bitcoin.getChain = sinon.stub().resolves({ name: 'BTC.main' });
        chluIpfs.bitcoin.options.network = 'main';
        error = undefined;
        try {
            await chluIpfs.bitcoin.start();
        } catch (err) {
            error = err;
        }
        expect(error).to.be.undefined;
        chluIpfs.bitcoin.getChain = sinon.stub().resolves({ name: 'BTC.test3' });
        chluIpfs.bitcoin.options.network = 'test3';
        error = undefined;
        try {
            await chluIpfs.bitcoin.start();
        } catch (err) {
            error = err;
        }
        expect(error).to.be.undefined;
        chluIpfs.bitcoin.getChain = sinon.stub().resolves({ name: 'BTC.testttt' });
        chluIpfs.bitcoin.options.network = 'testttt';
        error = undefined;
        try {
            await chluIpfs.bitcoin.start();
        } catch (err) {
            error = err;
        }
        expect(error).to.not.be.undefined;
    });

    it('isAvailable', async () => {
        expect(chluIpfs.bitcoin.isAvailable()).to.be.false;
        await chluIpfs.bitcoin.start();
        expect(chluIpfs.bitcoin.isAvailable()).to.be.true;
    });

    it('getChain', async () => {
        await chluIpfs.bitcoin.start();
        expect(chluIpfs.bitcoin.isAvailable()).to.be.true;
        const chain = await chluIpfs.bitcoin.getChain();
        expect(chain.name).to.equal('BTC.test3');
    });

    it('getTransaction', async () => {
        const txId = 'abcd';
        await chluIpfs.bitcoin.start();
        expect(chluIpfs.bitcoin.isAvailable()).to.be.true;
        const tx = await chluIpfs.bitcoin.getTransaction(txId);
        expect(chluIpfs.bitcoin.api.getTX.args[0][0]).to.equal(txId);
        expect(tx).to.deep.equal(exampleTransaction);
    });

    it.skip('getTransactionInfo', async () => {
        const txId = '84b4d88c3ad21881f79174bac6d0a12a7281108a22ed62d082f392a0e71e91ee';
        await chluIpfs.bitcoin.start();
        expect(chluIpfs.bitcoin.isAvailable()).to.be.true;
        const tx = await chluIpfs.bitcoin.getTransactionInfo(txId);
        expect(chluIpfs.bitcoin.api.getTX.args[0][0]).to.equal(txId);
        expect(tx).to.deep.equal({
            hash: txId,
            valid: true,
            confirmations: 2,
            isChlu: true,
            multihash: 'Qmdc9UyE2fogSGbuquB47q7wBGR4zQjnhQPNn8ZTNrQ3YS',
            fromAddress: 'mjw2BcBvNKkgLvQyYhzRERRgWSUVG7HHTb',
            toAddress: 'ms4TpM57RWHnEq5PRFtfJ8bcdiXoUE3tfv',
            amountSatoshi: 62441010,
            receivedAt: '2018-04-18T15:14:31.388Z',
            confirmedAt: '2018-04-18T15:23:26Z'
        });
    });
});