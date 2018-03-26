
const expect = require('chai').expect;
const sinon = require('sinon');
const { findIndex } = require('lodash');

const ChluIPFS = require('../src/ChluIPFS');
const logger = require('./utils/logger');

function getMockIpfsWithPubSub() {
    return {
        id: sinon.stub().resolves({
            id: 'myId'
        }),
        pubsub: {
            peers: sinon.stub().resolves(['FakePeer']),
            publish: sinon.stub().resolves(),
            subscribe: sinon.stub().resolves()
        }
    };
}

describe('Room module', () => {

    describe('broadcastUntil', () => {
        let chluIpfs;

        beforeEach(async () => {
            chluIpfs = new ChluIPFS({ type: ChluIPFS.types.customer, enablePersistence: false, logger: logger('Customer') });
            chluIpfs.ipfs = getMockIpfsWithPubSub();
            await chluIpfs.room.start();
        });

        it('Repeats broadcasts the specified number of times before giving up', done => {
            chluIpfs.room.broadcastUntil('message', 'FAKE_EVENT', {
                retry: true,
                retryAfter: 50,
                maxTries: 3,
                timeout: 10000,
            })
                .then(() => done(new Error('Test should have failed')))
                .catch(() => {
                    try {
                        expect(chluIpfs.ipfs.pubsub.publish.callCount).to.equal(3);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
        });

        it('Times out after an absolute amount of time', done => {
            chluIpfs.room.broadcastUntil('message', 'FAKE_EVENT', {
                retry: false,
                retryAfter: 10,
                maxTries: 5,
                timeout: 500
            }).catch(() => {
                expect(chluIpfs.ipfs.pubsub.publish.callCount).to.equal(1);
                done();
            });
        });

        it('Cleans up correctly', done => {
            sinon.spy(chluIpfs.events, 'removeListener');
            chluIpfs.room.broadcastUntil('message', 'FAKE_EVENT', {
                retry: true,
                retryAfter: 50,
                maxTries: 5,
                timeout: 1000
            }).catch(() => {
                try {
                    expect(chluIpfs.ipfs.pubsub.publish.callCount).to.equal(5);
                    expect(chluIpfs.events.removeListener.calledWith('peer joined')).to.be.true;
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });

        it('Handles success case', done => {
            chluIpfs.ipfs.pubsub.publish.onThirdCall().callsFake(() => {
                // Fake response after the third broadcast
                chluIpfs.events.emit('FAKE_EVENT');
            });
            chluIpfs.room.broadcastUntil('message', 'FAKE_EVENT', {
                retry: true,
                retryAfter: 100,
                maxTries: 5,
                timeout: 1000
            }).then(() => {
                try {
                    expect(chluIpfs.ipfs.pubsub.publish.callCount).to.equal(3);
                    done();
                } catch (err) {
                    done(err);
                }
            }).catch(done);
        });

        it('Retransmits immediately on peer join', done => {
            sinon.spy(chluIpfs.events, 'on');
            chluIpfs.ipfs.pubsub.publish.onFirstCall().callsFake(() => {
                // Fake a peer join after a delay
                setTimeout(() => {
                    // Call the listener that broadcastUntil added for the peer joined event
                    const args = chluIpfs.events.on.args;
                    const i = findIndex(args, o => o[0] === 'peer joined');
                    if (i) {
                        args[i][1]();
                    } else {
                        throw new Error('Expected event listener not found');
                    }
                }, 100);
            });
            chluIpfs.room.broadcastUntil('message', 'FAKE_EVENT', {
                retry: false,
                maxTries: 1,
                retryAfter: 10000,
                timeout: 300 
            }).catch(() => {
                expect(chluIpfs.ipfs.pubsub.publish.callCount).to.equal(2);
                done();
            });
        });

    });
});