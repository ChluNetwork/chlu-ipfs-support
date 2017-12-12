const expect = require('chai').expect;

const ChluIPFS = require('../src/index');
const ChluIPFSImpl = require('../src/ChluIPFS');
const ChluIPFSMock = require('../src/ChluIPFS.mock');

describe('ChluIPFS API', () => {
    it('constructor', () => {
        let type = ChluIPFS.types.customer;
        let chluIpfs = new ChluIPFS({ type });
        expect(chluIpfs.instance).to.be.instanceof(ChluIPFSImpl);
        chluIpfs = new ChluIPFS({ type, mock: true });
        expect(chluIpfs.instance).to.be.instanceof(ChluIPFSMock);
    });
});