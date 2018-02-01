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
            await new Promise(fullfill => {
                this.room.on('stop', fullfill);
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
        if (typeof message === 'string') message = Buffer.from(message);
        if (Buffer.isBuffer(message)) {
            this.room.broadcast(message);
        } else {
            throw new Error('Message format invalid');
        }
    }

    broadcastReviewUpdates(){
        this.broadcast({
            type: constants.eventTypes.customerReviews,
            address: this.chluIpfs.orbitDb.getPersonalDBAddress()
        });
    }

    async handleMessage(message) {
        try {
            const str = message.data.toString();
            this.chluIpfs.logger.debug('PubSub Message from ' + message.from + ': ' + str);
            const obj = JSON.parse(str);

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

            if (this.chluIpfs.type === constants.types.service) {
                // Service node stuff
                const isOrbitDb = obj.type === constants.eventTypes.customerReviews || obj.type === constants.eventTypes.updatedReview;
                // handle ReviewRecord: pin hash
                if (obj.type === constants.eventTypes.wroteReviewRecord && typeof obj.multihash === 'string') {
                    this.chluIpfs.logger.info('Pinning ReviewRecord ' + obj.multihash);
                    try {
                        await this.chluIpfs.pinning.pin(obj.multihash);
                        this.chluIpfs.logger.info('Pinned ReviewRecord ' + obj.multihash);
                    } catch(exception){
                        this.chluIpfs.logger.error('Pin Error: ' + exception.message);
                    }
                } else if (isOrbitDb && typeof obj.address === 'string') {
                    // handle OrbitDB: replicate
                    try {
                        this.chluIpfs.orbitDb.replicate(obj.address);
                    } catch(exception){
                        this.chluIpfs.logger.error('OrbitDB Replication Error: ' + exception.message);
                    }
                }
            }
        } catch(exception) {
            this.chluIpfs.logger.warn('Error while decoding PubSub message');
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

module.exports = Room;