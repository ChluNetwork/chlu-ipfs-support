const sinon = require('sinon');
const exampleTransaction = require('./chlu_transaction_example.json');

class BlockcypherMock {
    constructor(...args) {
        this.args = args;
        this.getChain = sinon.stub().yields(null, { name: 'BTC.test3' });
        this.getTX = sinon.stub().yields(null, exampleTransaction);
    }
}

module.exports = {
    BlockcypherMock,
    exampleTransaction
};