const constants = require('../constants');
const PubSubRoom = require('ipfs-pubsub-room');

class Room {

    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
        this.room = undefined;
    }

    async start() {
        // PubSub setup
        if (!this.room) {
            this.room = PubSubRoom(this.chluIpfs.ipfs, constants.pubsubRoom);
            // Handle events
            this.listenToRoomEvents(this.room);
            this.room.on('message', message => this.handleMessage(message));
            // wait for room subscription
            await new Promise(resolve => {
                this.room.once('subscribed', () => resolve());
            });
        }
    }

    async stop() {
        if (this.room) {
            await new Promise(resolve => {
                this.room.on('stop', resolve);
                this.room.leave();
            });
            this.room = undefined;
        }
    }

    async waitForAnyPeer() {
        if (this.room.getPeers().length === 0) {
            await new Promise(resolve => {
                this.room.on('peer joined', () => resolve());
            });
        }
    }

    broadcast(msg) {
        let message = msg;
        if (typeof message === 'object') message = JSON.stringify(message);
        if (typeof message === 'string') {
            this.chluIpfs.logger.debug('Broadcasting message: ' + message);
            message = Buffer.from(message);
        }
        if (Buffer.isBuffer(message)) {
            this.room.broadcast(message);
        } else {
            throw new Error('Message format invalid');
        }
    }

    async broadcastUntil(msg, expected, options = {}) {
        let {
            retry = true,
            tryEvery = 3000,
            maxTries = 5,
            timeout = 15000
        } = options;
        let timeoutRef = null;
        let globalTimeoutRef = null;
        let tried = 0;
        let done = false;
        const self = this;
        // function that sends the message
        const broadcaster = () => {
            if (!done && self.room) return self.broadcast.call(self, msg);
        };
        // function that clears dangling timeouts
        const cleanup = () => {
            done = true;
            if (self.room) self.room.removeListener('peer joined', broadcaster);
            clearTimeout(timeoutRef);
            clearTimeout(globalTimeoutRef);
        };
        // function that schedules the next resend
        const retrier = reject => {
            if (tried === 0 || (retry && maxTries > tried)) {
                tried++;
                broadcaster();
                if (!done) {
                    timeoutRef = setTimeout(() => {
                        if (!done) retrier(reject);
                    }, tryEvery);
                }
            } else {
                // Use this instead of throwing to avoid
                // uncatchable errors inside scheduled
                // calls using setTimeout
                cleanup();
                reject('Broadcast timed out: too many retries (' + tried + ')');
            }
        };
        await new Promise(async (resolve, reject) => {
            // set up absolute timeout
            if (timeout > 0) {
                globalTimeoutRef = setTimeout(() => {
                    if (!done) {
                        cleanup();
                        reject('Broadcast timed out after ' + timeout + 'ms');
                    }
                }, timeout);
            }
            // set up resolution case
            this.chluIpfs.events.once(expected, () =>  resolve());
            // set up automatic resend on peer join
            this.room.on('peer joined', broadcaster);
            // wait for a peer to appear if there are none
            await this.waitForAnyPeer();
            // broadcast and schedule next resend
            timeoutRef = retrier(reject);
        });
        // Arriving at this point means everything worked
        cleanup();
    }

    async broadcastReviewUpdates(){
        return await this.broadcastUntil({
            type: constants.eventTypes.customerReviews,
            address: this.chluIpfs.orbitDb.getPersonalDBAddress()
        }, constants.eventTypes.replicated + '_' + this.chluIpfs.getOrbitDBAddress());
    }

    async handleMessage(message) {
        try {
            const myId = (await this.chluIpfs.ipfs.id()).id;
            if (message.from !== myId) {
                const str = message.data.toString();
                this.chluIpfs.logger.debug('Handling PubSub message from ' + message.from + ': ' + str);
                const obj = parseMessage(message);

                this.chluIpfs.events.emit('message', obj);

                // Handle internal events
                this.chluIpfs.events.emit(obj.type || constants.eventTypes.unknown, obj);
                if (obj.type === constants.eventTypes.pinned) {
                    // Emit internal PINNED event
                    this.chluIpfs.events.emit(constants.eventTypes.pinned + '_' + obj.multihash);
                }
                if (obj.type === constants.eventTypes.replicated) {
                    // Emit internal REPLICATED event
                    this.chluIpfs.events.emit(constants.eventTypes.replicated + '_' + obj.address);
                }
            }
        } catch(exception) {
            this.chluIpfs.logger.warn('Error while decoding PubSub message: ' + message.data.toString());
            console.error(exception);
        }
    }

    listenToRoomEvents(room){
        room.on('peer joined', peer => {
            this.chluIpfs.logger.debug('Peer joined the pubsub room', peer);
        });
        room.on('peer left', peer => {
            this.chluIpfs.logger.debug('Peer left the pubsub room', peer);
        });
        room.on('subscribed', () => {
            this.chluIpfs.logger.debug('Connected to the pubsub room');
        });
        room.on('error', error => {
            this.chluIpfs.logger.error('PubSub Room Error: ' + error.message || error);
        });
    }

}

function parseMessage(message) {
    const str = message.data.toString();
    const obj = JSON.parse(str);
    return obj;
}

module.exports = Object.assign(Room, { parseMessage });