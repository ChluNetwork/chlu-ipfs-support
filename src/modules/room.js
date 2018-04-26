const { difference, without } = require('lodash');
const constants = require('../constants');

class Room {

    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
        this.subscription = null;
        this.topic = null;
        this.peers = [];
    }

    async start() {
        // PubSub setup
        if (!this.subscription) {
            this.topic = this.chluIpfs.network ? ('chlu-' + this.chluIpfs.network) : 'chlu';
            this.subscription = msg => this.handleMessage(msg);
            await this.chluIpfs.ipfs.pubsub.subscribe(this.topic, this.subscription);
            this.chluIpfs.logger.debug('Subscribed to pubsub topic: ' + this.topic);
            this.listenToPubSubEvents();
            await this.updatePeers();
            this.pollPeers();
            this.chluIpfs.events.emit('pubsub/subscribed', this.topic);
            // TODO: update listenToRoomEvents to poll for info instead
            // TODO: call watchPubSubTopic
        }
    }

    async stop() {
        if (this.topic && this.subscription) {
            await this.chluIpfs.ipfs.pubsub.unsubscribe(this.topic, this.subscription);
            this.chluIpfs.logger.debug('Unsubscribed from pubsub topic: ' + this.topic);
            this.chluIpfs.events.emit('pubsub/unsubscribed', this.topic);
        }
        this.subscription = null;
        this.topic = null;
        this.peers = [];
    }

    async waitForAnyPeer() {
        if (this.getPeers().length === 0) {
            await new Promise((resolve, reject) => {
                this.chluIpfs.events.on('pubsub/peer/joined', () => resolve());
                this.chluIpfs.events.on('pubsub/error', err => reject(err));
            });
        }
    }

    async broadcast(msg) {
        let message = msg;
        if (typeof message === 'object') message = JSON.stringify(message);
        if (typeof message === 'string') {
            this.chluIpfs.logger.debug('Broadcasting message: ' + message);
            message = Buffer.from(message);
        }
        if (Buffer.isBuffer(message)) {
            await this.chluIpfs.ipfs.pubsub.publish(this.topic, message);
        } else {
            throw new Error('Message format invalid');
        }
    }

    async broadcastUntil(msg, expected, options = {}) {
        let {
            retry = true,
            retryAfter = 500,
            maxTries = 5,
            timeout = 7000
        } = options;
        let timeoutRef = null;
        let globalTimeoutRef = null;
        let tried = 0;
        let done = false;
        const self = this;
        // function that sends the message
        const broadcaster = async () => {
            if (!done && self.subscription) return await self.broadcast(msg);
        };
        // function that clears dangling timeouts
        const cleanup = () => {
            done = true;
            self.chluIpfs.events.removeListener('pubsub/peer/joined', broadcaster);
            clearTimeout(timeoutRef);
            clearTimeout(globalTimeoutRef);
        };
        // function that schedules the next resend
        const retrier = async reject => {
            if (tried === 0 || (retry && maxTries > tried)) {
                tried++;
                const nextTryIn = retryAfter * tried;
                if (!done) {
                    try {
                        await broadcaster();
                        timeoutRef = setTimeout(() => {
                            if (!done) retrier(reject);
                        }, nextTryIn);
                    } catch (error) {
                        reject(error);
                    }
                }
            } else {
                // Use this instead of throwing to avoid
                // uncatchable errors inside scheduled
                // calls using setTimeout
                cleanup();
                reject(new Error('Broadcast timed out: too many retries (' + tried + ')'));
            }
        };
        await new Promise(async (resolve, reject) => {
            // set up absolute timeout
            if (timeout > 0) {
                globalTimeoutRef = setTimeout(() => {
                    if (!done) {
                        cleanup();
                        reject(new Error('Broadcast timed out after ' + timeout + 'ms'));
                    }
                }, timeout);
            }
            // set up resolution case
            this.chluIpfs.events.once(expected, () => {
                cleanup();
                resolve();
            });
            // set up automatic resend on peer join
            this.chluIpfs.events.on('pubsub/peer/joined',  broadcaster);
            // wait for a peer to appear if there are none
            await this.waitForAnyPeer();
            // broadcast and schedule next resend
            await retrier(reject);
        });
    }

    async handleMessage(message) {
        try {
            const myId = await this.chluIpfs.ipfsUtils.id();
            if (message.from !== myId) {
                const str = message.data.toString();
                this.chluIpfs.logger.debug('Handling PubSub message from ' + message.from + ': ' + str);
                const obj = parseMessage(message);

                this.chluIpfs.events.emit('pubsub/message', obj);

                // Handle internal events
                // TODO: refactor this
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
            const error = 'Error while decoding PubSub message: ' + message.data.toString();
            this.chluIpfs.logger.warn(error);
            this.chluIpfs.events.emit('error', error);
        }
    }

    getPeers() {
        return [...this.peers]; // Readonly copy
    }

    pollPeers(intervalMs = 1000) {
        if (this.topic && this.subscription) {
            this.pollPeersTimeout = setTimeout(self => {
                self.updatePeers()
                    .then(() => self.pollPeers(intervalMs))
                    .catch(err => self.chluIpfs.events.emit('pubsub/error', err));
            }, intervalMs, this);
        }
    }

    stopPollingPeers() {
        clearTimeout(this.pollPeersTimeout);
    }

    async updatePeers() {
        if (this.subscription && this.topic) {
            try {
                const myId = await this.chluIpfs.ipfsUtils.id();
                const pubsubPeers = await this.chluIpfs.ipfs.pubsub.peers(this.topic);
                const updatedPeers = without(pubsubPeers, myId);
                const currentPeers = this.getPeers();
                const joinedPeers = difference(updatedPeers, currentPeers);
                const leftPeers = difference(currentPeers, updatedPeers);
                this.peers = updatedPeers;
                this.emitPeerEvents(joinedPeers, leftPeers);
            } catch (error) {
                this.chluIpfs.events.emit('pubsub/error', error);
                this.emitPeerEvents([], this.peers || []);
                this.peers = [];
            }
        } else {
            this.emitPeerEvents([], this.peers || []);
            this.peers = [];
        }
    }

    emitPeerEvents(joinedPeers = [], leftPeers = []) {
        joinedPeers.forEach(p => this.chluIpfs.events.emit('pubsub/peer/joined', p));
        leftPeers.forEach(p => this.chluIpfs.events.emit('pubsub/peer/left', p));
    }

    listenToPubSubEvents() {
        this.chluIpfs.events.on('pubsub/peer/joined', peer => {
            this.chluIpfs.logger.debug(peer + ' joined the pubsub room');
        });
        this.chluIpfs.events.on('pubsub/peer/left', peer => {
            this.chluIpfs.logger.debug(peer + ' left the pubsub room');
        });
        this.chluIpfs.events.on('pubsub/subscribed', () => {
            this.chluIpfs.logger.debug('Connected to the pubsub room');
        });
        this.chluIpfs.events.on('pubsub/error', error => {
            this.chluIpfs.logger.error('PubSub Error: ' + error.message || error);
        });
    }

}

function parseMessage(message) {
    const str = message.data.toString();
    const obj = JSON.parse(str);
    return obj;
}

module.exports = Object.assign(Room, { parseMessage });