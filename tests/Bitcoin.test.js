const expect = require('chai').expect;
const sinon = require('sinon');
const btcUtils = require('./utils/bitcoin');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');


describe('Bitcoin Module', () => {
    let chluIpfs;

    const bitcoinNetwork = 'test3';
    const blockCypherApiKey = 'fakekey';

    beforeEach(() => {
        chluIpfs = new ChluIPFS({
            enablePersistence: false,
            cache: { enabled: false },
            logger: logger('Service'),
            bitcoinNetwork,
            blockCypherApiKey
        });
        // mock blockcypher
        chluIpfs.bitcoin.BitcoinAPIClient = btcUtils.BitcoinAPIClientMock;
    });
    
    it('passes options correctly', async () => {
        expect(chluIpfs.bitcoin.options).to.deep.equal({
            enabled: true,
            network: bitcoinNetwork,
            apiKey: blockCypherApiKey
        });
        await chluIpfs.bitcoin.start();
        expect(chluIpfs.bitcoin.api.args).to.deep.equal([
            bitcoinNetwork, blockCypherApiKey
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

    it('reports blockchain availability correctly', async () => {
        expect(chluIpfs.bitcoin.isAvailable()).to.be.false;
        await chluIpfs.bitcoin.start();
        expect(chluIpfs.bitcoin.isAvailable()).to.be.true;
    });

    it('can retrieve chain name', async () => {
        await chluIpfs.bitcoin.start();
        expect(chluIpfs.bitcoin.isAvailable()).to.be.true;
        const chain = await chluIpfs.bitcoin.getChain();
        expect(chain.name).to.equal('BTC.test3');
    });

    it('can retrieve raw transaction info', async () => {
        const txId = 'abcd';
        await chluIpfs.bitcoin.start();
        expect(chluIpfs.bitcoin.isAvailable()).to.be.true;
        const tx = await chluIpfs.bitcoin.getTransaction(txId);
        expect(chluIpfs.bitcoin.api.getTX.args[0][0]).to.equal(txId);
        expect(tx).to.deep.equal(btcUtils.exampleTransaction);
    });

    it('can process raw transaction info into the data Chlu needs', async () => {
        const txId = btcUtils.exampleTransaction.hash.slice(0);
        await chluIpfs.bitcoin.start();
        expect(chluIpfs.bitcoin.isAvailable()).to.be.true;
        const tx = await chluIpfs.bitcoin.getTransactionInfo(txId);
        expect(chluIpfs.bitcoin.api.getTX.args[0][0]).to.equal(txId);
        expect(tx).to.deep.equal({
            hash: txId,
            doubleSpend: false,
            confirmations: 2,
            isChlu: true,
            multihash: 'Qmdc9UyE2fogSGbuquB47q7wBGR4zQjnhQPNn8ZTNrQ3YS',
            fromAddress: 'mjw2BcBvNKkgLvQyYhzRERRgWSUVG7HHTb',
            outputs: [
                {
                    index: 0,
                    toAddress: 'ms4TpM57RWHnEq5PRFtfJ8bcdiXoUE3tfv',
                    value: 309696
                },
            ],
            spentSatoshi: 309696,
            receivedAt: '2018-04-18T15:14:31.388Z',
            confirmedAt: '2018-04-18T15:23:26Z'
        });
    });
});