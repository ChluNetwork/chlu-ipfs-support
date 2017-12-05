const ChluIPFS = require('../src/index');
const ChluIPFSImpl = require('../src/ChluIPFS');
const ChluIPFSMock = require('../src/ChluIPFS.mock');

describe('ChluIPFS API', () => {
    test('constructor', () => {
        let type = ChluIPFS.types.customer;
        let chluIpfs = new ChluIPFS({ type });
        expect(chluIpfs.instance).toBeInstanceOf(ChluIPFSImpl);
        chluIpfs = new ChluIPFS({ type, mock: true });
        expect(chluIpfs.instance).toBeInstanceOf(ChluIPFSMock);
    });
});