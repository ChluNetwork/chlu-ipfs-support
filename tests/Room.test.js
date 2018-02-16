
const expect = require('chai').expect;
const sinon = require('sinon');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');

function getMockPubSubRoom() {
    return {
        getPeers: sinon.stub().returns(1),
        broadcast: sinon.stub(),
        on: sinon.stub(),
        removeListener: sinon.stub()
    };
}

describe('Room module', () => {

    describe('broadcastUntil', () => {

        it('Repeats broadcasts the specified number of times before giving up', done => {
            const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false, logger: logger('Customer') });
            chluIpfs.room.room = getMockPubSubRoom();
            chluIpfs.room.broadcastUntil('message', 'FAKE_EVENT', {
                retry: true,
                retryAfter: 50,
                maxTries: 3,
                timeout: 10000,
            }).catch(() => {
                expect(chluIpfs.room.room.broadcast.callCount).to.equal(3);
                done();
            });
        });

        it('Times out after an absolute amount of time', done => {
            const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false, logger: logger('Customer') });
            chluIpfs.room.room = getMockPubSubRoom();
            chluIpfs.room.broadcastUntil('message', 'FAKE_EVENT', {
                retry: false,
                retryAfter: 10,
                maxTries: 5,
                timeout: 500
            }).catch(() => {
                expect(chluIpfs.room.room.broadcast.callCount).to.equal(1);
                done();
            });
        });

        it('Cleans up correctly', done => {
            const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false, logger: logger('Customer') });
            chluIpfs.room.room = getMockPubSubRoom();
            chluIpfs.room.broadcastUntil('message', 'FAKE_EVENT', {
                retry: true,
                retryAfter: 50,
                maxTries: 5,
                timeout: 1000
            }).catch(() => {
                expect(chluIpfs.room.room.broadcast.callCount).to.equal(5);
                expect(chluIpfs.room.room.removeListener.calledWith('peer joined')).to.be.true;
                done();
            });
        });

        it('Handles success case', done => {
            const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false, logger: logger('Customer') });
            chluIpfs.room.room = getMockPubSubRoom();
            chluIpfs.room.room.broadcast.onThirdCall().callsFake(() => {
                // Fake response after the third broadcast
                chluIpfs.events.emit('FAKE_EVENT');
            });
            chluIpfs.room.broadcastUntil('message', 'FAKE_EVENT', {
                retry: true,
                retryAfter: 100,
                maxTries: 5,
                timeout: 1000
            }).then(() => {
                expect(chluIpfs.room.room.broadcast.callCount).to.equal(3);
                done();
            });
        });

        it('Retransmits immediately on peer join', done => {
            const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false, logger: logger('Customer') });
            chluIpfs.room.room = getMockPubSubRoom();
            chluIpfs.room.room.broadcast.onFirstCall().callsFake(() => {
                // Fake a peer join after a delay
                setTimeout(() => {
                    // Call the listener that broadcastUntil added for the peer joined event
                    if (chluIpfs.room.room.on.args[0][0] !== 'peer joined') {
                        throw new Error('This test might not be relevant anymore');
                    }
                    chluIpfs.room.room.on.args[0][1]();
                }, 100);
            });
            chluIpfs.room.broadcastUntil('message', 'FAKE_EVENT', {
                retry: false,
                maxTries: 1,
                retryAfter: 10000,
                timeout: 300 
            }).catch(() => {
                expect(chluIpfs.room.room.broadcast.callCount).to.equal(2);
                done();
            });
        });

    });
});