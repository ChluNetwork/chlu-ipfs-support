const sinon = require('sinon');
const { cloneDeep } = require('lodash');
const exampleTransaction = require('./chlu_transaction_example.json');

class BitcoinAPIClientMock {
    constructor(...args) {
        this.restore();
        this.args = args;
        this.getChain = sinon.stub().resolves({ name: 'BTC.test3' });
        this.getTX = sinon.stub().resolves(this.tx);
        // TODO: getTX always returns a Deep Clone instead of a ref to this.tx
    }

    returnMatchingTXForRR(rr) {
        this.tx.inputs[0].addresses = [rr.customer_address];
        this.tx.outputs[0].value = rr.amount;
        this.tx.outputs[0].addresses = [rr.vendor_address];
        this.tx.outputs[1].value = this.tx.total - this.tx.outputs[0].value;
        this.tx.outputs[1].addresses = [rr.customer_address];
        this.tx.outputs[2].data_string = rr.multihash;
    }

    restore() {
        this.tx = cloneDeep(exampleTransaction);
    }

}

module.exports = {
    BitcoinAPIClientMock,
    exampleTransaction
};