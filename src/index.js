const ipfsUtils = require('./utils/ipfs');
const OrbitDB = require('orbit-db');
const Room = require('ipfs-pubsub-room');
const EventEmitter = require('events');

const constant = {
    types: {
        customer: 'CUSTOMER',
        vendor: 'VENDOR',
        marketplace: 'MARKETPLACE',
        service: 'SERVICE'
    },
    eventTypes: {
        unknown: 'UNKNOWN',
        pinning: 'PINNING',
        pinned: 'PINNED',
        wroteReviewRecord: 'WROTE_REVIEW_RECORD',
        updatedReview: 'UPDATED_REVIEW'
    },
    defaultIPFSOptions: {
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
    }
};

class ChluIPFS {

    constructor(options = {}){
        const additionalOptions = {
            // TODO: review this. We should have a persistent store in node. Volatile is fine in the browser
            store: String(Math.random() + Date.now())
        };
        // TODO: review persisting data in orbitDb. we don't need persistence in the browser but it would help.
        this.orbitDbDirectory = options.orbitDbDirectory || '../orbit-db';
        this.ipfsOptions = Object.assign(
            {},
            constant.defaultIPFSOptions,
            additionalOptions,
            options.ipfs || {}
        );
        this.type = options.type;
        if (Object.values(constant.types).indexOf(this.type) < 0) {
            throw new Error('Invalid type');
        }
        this.utils = ipfsUtils;
        this.events = new EventEmitter();
    }
    
    async start(){
        this.ipfs = await this.utils.createIPFS(this.ipfsOptions);
        // OrbitDB setup
        this.orbitDb = new OrbitDB(this.ipfs, this.orbitDbDirectory);
        if (this.type === constant.types.customer) {
            this.db = await this.orbitDb.feed('chlu-experimental-customer-review-updates');
        }
        // PubSub setup
        this.room = Room(this.ipfs, 'chlu-experimental');
        // handle events
        this.room.on('message', message => this.handleMessage(message));
        // wait for room subscription'before returning
        await new Promise(resolve => {
            this.room.on('subscribed', () => resolve());
        });
        // If customer, also wait for at least one peer to join the room (TODO: review this)
        if (this.type === constant.types.customer) {
            await new Promise(resolve => {
                this.room.on('peer joined', () => resolve());
            });
        }
        return true;
    }

    async stop() {
        await this.room.leave();
        if (this.db) await this.db.close();
        await this.ipfs.stop();
        this.db = undefined;
        this.room = undefined;
        this.orbitDb = undefined;
        this.ipfs = undefined;
    }

    async pin(multihash){
        // broadcast start of pin process
        await this.room.broadcast(this.utils.encodeMessage({ type: constant.eventTypes.pinning, multihash }));
        if (this.ipfs.pin) {
            await this.ipfs.pin.add(multihash, { recursive: true });
        } else {
            // TODO: Bad!!! fix!!!!
            console.warn('This node is running an IPFS client that does not implement pinning. Falling back to just retrieving the data non recursively');
            await this.ipfs.object.get(multihash);
        }
        // broadcast successful pin
        await this.room.broadcast(this.utils.encodeMessage({ type: constant.eventTypes.pinned, multihash }));
    }

    getOrbitDBAddress(){
        if (this.type === constant.types.customer) {
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
        await new Promise(fullfill => {
            this.events.once(constant.eventTypes.pinned + '_' + multihash, () => fullfill());
            this.room.broadcast(this.utils.encodeMessage({ type: constant.eventTypes.wroteReviewRecord, multihash }));
        });
        return multihash;
    }

    async exportData() {
        const exported = {};
        if (this.type === constant.types.customer) {
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

    async getVendorKeys(ipnsName) {
        throw new Error('not implemented');
    }
    
    async publishKeys(publicEncKey, publicSigKey) {
        throw new Error('not implemented');
    }

    publishUpdatedReview(updatedReview) {
        throw new Error('not implemented');
    }

    handleMessage(message) {
        console.log('pubsub message:', message.data.toString());
        try {
            const obj = JSON.parse(message.data.toString());
            this.events.emit(obj.type || constant.eventTypes.unknown, obj);
            if (obj.type === constant.eventTypes.pinned) {
                // Emit internal PINNED event
                this.events.emit(constant.eventTypes.pinned + '_' + obj.multihash);
            }
        } catch(exception) {
            console.log('Message was not JSON encoded');
        }
    }

    runServiceNode() {
        this.room.on('message', async message => {
            // parse messages
            let obj = null;
            try {
                obj = JSON.parse(message.data.toString());
            } catch(exception) {
                obj = {};
            }
            // handle ReviewRecord: pin hash
            if (obj.type === constant.eventTypes.wroteReviewRecord && typeof obj.multihash === 'string') {
                console.log('Pinning ReviewRecord', obj.multihash);
                try {
                    await this.pin(obj.multihash);
                } catch(exception){
                    console.log('Pin Error:', exception.message);
                }
            }
        });
    }
}

module.exports = Object.assign(ChluIPFS, constant);