const ipfsUtils = require('./utils/ipfs');
const OrbitDB = require('orbit-db');
const Room = require('ipfs-pubsub-room');
const EventEmitter = require('events');
const constants = require('./constants');
const defaultLogger = require('./utils/logger');

const defaultIPFSOptions = {
    EXPERIMENTAL: {
        pubsub: true
    },
    config: {
        Addresses: {
            Swarm: [
                // Enable WebSocketStar transport
                '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star'
            ]
        }
    }
};

class ChluIPFS {

    constructor(options = {}){
        const additionalOptions = {
            // TODO: review this. We should have a persistent store in node. Volatile is fine in the browser
            store: String(Math.random() + Date.now())
        };
        // TODO: review persisting data in orbitDb. we don't need persistence in the browser but it would help.
        this.orbitDbDirectory = options.orbitDbDirectory || '../orbitdb';
        this.ipfsOptions = Object.assign(
            {},
            defaultIPFSOptions,
            additionalOptions,
            options.ipfs || {}
        );
        this.type = options.type;
        if (Object.values(constants.types).indexOf(this.type) < 0) {
            throw new Error('Invalid type');
        }
        this.utils = ipfsUtils;
        this.events = new EventEmitter();
        this.logger = options.logger || defaultLogger;
    }
    
    async start(){
        if (!this.ipfs) {
            this.ipfs = await this.utils.createIPFS(this.ipfsOptions );
        }
        // OrbitDB setup
        if (!this.orbitDb) {
            this.orbitDb = new OrbitDB(this.ipfs, this.orbitDbDirectory);
        }
        if (this.type === constants.types.customer && !this.db) {
            this.db = await this.orbitDb.feed(constants.customerDbName);
        }
        // PubSub setup
        if (!this.room) {
            this.room = Room(this.ipfs, constants.pubsubRoom);
            // handle events
            this.room.on('message', message => this.handleMessage(message));
            // wait for room subscription
            await new Promise(resolve => {
                this.room.on('subscribed', () => resolve());
            });
        }
        // If customer, also wait for at least one peer to join the room (TODO: review this)
        if (this.type === constants.types.customer) {
            if (this.room.getPeers().length === 0) {
                await new Promise(resolve => {
                    this.room.on('peer joined', () => resolve());
                });
            }
            // Broadcast my review updates DB
            this.broadcastReviewUpdates();
        } else if (this.type === constants.types.service) {
            this.dbs = {};
            this.startServiceNode();
        }
        return true;
    }

    broadcastReviewUpdates(){
        this.room.broadcast(this.utils.encodeMessage({
            type: constants.eventTypes.customerReviews,
            address: this.getOrbitDBAddress()
        }));
    }

    async stop() {
        this.room.leave();
        await this.orbitDb.stop();
        await this.ipfs.stop();
        this.orbitDb = undefined;
        this.db = undefined;
        this.room = undefined;
        this.orbitDb = undefined;
        this.ipfs = undefined;
    }

    async pin(multihash){
        // broadcast start of pin process
        await this.room.broadcast(this.utils.encodeMessage({ type: constants.eventTypes.pinning, multihash }));
        if (this.ipfs.pin) {
            await this.ipfs.pin.add(multihash, { recursive: true });
        } else {
            // TODO: Chlu service node need to be able to pin, so we should support using go-ipfs
            this.logger.warn('This node is running an IPFS client that does not implement pinning. Falling back to just retrieving the data non recursively. This will not be supported');
            await this.ipfs.object.get(multihash);
        }
        // broadcast successful pin
        await this.room.broadcast(this.utils.encodeMessage({ type: constants.eventTypes.pinned, multihash }));
    }

    getOrbitDBAddress(){
        if (this.type === constants.types.customer) {
            return this.db.address.toString();
        } else {
            throw new Error('Not a customer');
        }
    }

    async storeReviewRecord(reviewRecord){
        // TODO: check format, check is customer
        // write thing to ipfs
        const dagNode = await this.ipfs.object.put(reviewRecord);
        const multihash = this.utils.multihashToString(dagNode.multihash);
        // Broadcast request for pin, then wait for response
        // TODO: handle a timeout and also rebroadcast periodically, otherwise new peers won't see the message
        await new Promise(fullfill => {
            this.events.once(constants.eventTypes.pinned + '_' + multihash, () => fullfill());
            this.room.broadcast(this.utils.encodeMessage({ type: constants.eventTypes.wroteReviewRecord, multihash }));
        });
        return multihash;
    }

    async exportData() {
        const exported = {};
        if (this.type === constants.types.customer) {
            exported.customerDbKeys = {
                pub: await this.db.keystore.exportPublicKey(),
                priv: await this.db.keystore.exportPrivateKey()
            };
        }
        return exported;
    }

    async importData() {
        throw new Error('not implemented');
    }

    async getVendorKeys() {
        throw new Error('not implemented');
    }
    
    async publishKeys() {
        throw new Error('not implemented');
    }

    async publishUpdatedReview(updatedReview) {
        // TODO: check format, check is customer
        this.logger.debug('Adding updated review');
        await new Promise(async fullfill => {
            const address = this.getOrbitDBAddress();
            this.events.once(constants.eventTypes.replicated + '_' + address, () => fullfill());
            await this.db.add(updatedReview);
            this.broadcastReviewUpdates();
            this.logger.debug('Waiting for remote replication');
        });
        this.logger.debug('Done');
    }

    handleMessage(message) {
        this.logger.debug('pubsub message: ' + message.data.toString());
        try {
            const obj = JSON.parse(message.data.toString());
            this.events.emit(obj.type || constants.eventTypes.unknown, obj);
            if (obj.type === constants.eventTypes.pinned) {
                // Emit internal PINNED event
                this.events.emit(constants.eventTypes.pinned + '_' + obj.multihash);
            }
            if (obj.type === constants.eventTypes.replicated) {
                // Emit internal REPLICATED event
                this.events.emit(constants.eventTypes.replicated + '_' + obj.address);
            }
        } catch(exception) {
            this.logger.warn('Message was not JSON encoded');
        }
    }

    async replicate(address) {
        this.logger.info('Replicating ' + address);
        this.room.broadcast(this.utils.encodeMessage({ type: constants.eventTypes.replicating, address }));
        if (!this.dbs[address]) {
            this.logger.debug('Initializing local copy of ' + address);
            this.dbs[address] = await this.orbitDb.feed(address);
            //await this.dbs[address].load();
        }
        await new Promise(fullfill => {
            this.dbs[address].events.on('replicated', fullfill);
        });
        this.room.broadcast(this.utils.encodeMessage({ type: constants.eventTypes.replicated, address }));
        this.logger.info('Replicated ' + address);
    }

    startServiceNode() {
        this.room.on('message', async message => {
            // parse messages
            const obj = this.utils.decodeMessage(message);
            // handle ReviewRecord: pin hash
            if (obj.type === constants.eventTypes.wroteReviewRecord && typeof obj.multihash === 'string') {
                this.logger.info('Pinning ReviewRecord ' + obj.multihash);
                try {
                    await this.pin(obj.multihash);
                    this.logger.info('Pinned ReviewRecord ' + obj.multihash);
                } catch(exception){
                    this.logger.error('Pin Error: ' + exception.message);
                }
            }
            // handle OrbitDB: replicate
            const isOrbitDb = obj.type === constants.eventTypes.customerReviews || obj.type === constants.eventTypes.updatedReview;
            if (isOrbitDb && typeof obj.address === 'string') {
                try {
                    this.replicate(obj.address);
                } catch(exception){
                    this.logger.error('OrbitDB Replication Error: ' + exception.message);
                }
            }
        });
    }
}

module.exports = Object.assign(ChluIPFS, constants);