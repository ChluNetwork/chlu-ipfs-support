const ipfsUtils = require('./utils/ipfs');
const OrbitDB = require('orbit-db');

const constant = {
    types: {
        customer: 'CUSTOMER',
        vendor: 'VENDOR',
        marketplace: 'MARKETPLACE',
        service: 'SERVICE'
    },
    defaultIPFSOptions: {
        EXPERIMENTAL: {
            pubsub: true
        }
    }
};

class ChluIPFS {

    constructor(options = {}){
        const additionalOptions = {
            store: String(Math.random() + Date.now())
        };
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
    }
    
    async start(){
        this.ipfs = await this.utils.createIPFS();
        this.orbitDb = new OrbitDB(this.ipfs, this.orbitDbDirectory);
        if (this.type === constant.types.customer) {
            this.db = this.orbitDb.feed('customer-review-updates');
        }
        return true;
    }

    async stop() {
        await this.ipfs.stop();
        return true;
    }

    async pin(multihash){
        await this.ipfs.pin.add(multihash, { recursive: true });
    }

    getOrbitDBAddress(){
        if (this.type === constant.types.customer) {
            return this.db.address.toString();
        } else {
            throw new Error('Not a customer');
        }
    }

    async storeReviewRecord(reviewRecord){
        // TODO check format, check is customer, broadcast event
        const dagNode = await this.ipfs.object.put(reviewRecord);
        return this.utils.multihashToString(dagNode.multihash);
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

    listenForReviewUpdates(handler) {
        throw new Error('not implemented');
    }

    listenForEvents(handler) {
        throw new Error('not implemented');
    }

    publishUpdatedReview(updatedReview) {
        throw new Error('not implemented');
    }
}

module.exports = Object.assign(ChluIPFS, constant);