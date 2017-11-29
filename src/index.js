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
}

class ChluIPFS {

    constructor(options = {}){
        const additionalOptions = {
            store: String(Math.random() + Date.now())
        };
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
        if (options.utilsModule) {
            this.utils = options.utilsModule;
        } else {
            this.utils = ipfsUtils;
        }
        if (options.ipfsModule) this.ipfs = options.ipfsModule;
    }

    /**
     * Prepares internal components for use
     * 
     * @returns promise
     * @memberof ChluIPFS
     */
    async start(){
        this.ipfs = await this.utils.createIPFS();
        /*
        this.orbitDb = new OrbitDB(this.ipfs);
        if (this.type === constant.types.customer) {
            this.db = this.orbitDb.feed('customer-review-updates');
        }
        */
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
        if (this.type === ChluIPFS.types.customer) {
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
}

module.exports = Object.assign(ChluIPFS, constant);