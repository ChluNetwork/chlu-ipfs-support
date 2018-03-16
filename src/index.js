const ChluIPFSImpl = require('./ChluIPFS');
const ChluIPFSMock = require('./ChluIPFS.mock');
const constants = require('./constants');

/**
 * ChluIPFS is a library that handles the storage,
 * exchange and discovery of Chlu data using the
 * IPFS protocol. This class can be instanced to
 * provide an high level Chlu specific API
 * to interact with Chlu data.
 * 
 * Remember to call .start() after setting it up
 * 
 * @param {Object} options mandatory configuration
 * @param {string} options.type (mandatory) one of the values contained in ChluIPFS.types
 * @param {boolean} options.mock default false. If true, constructs a mock ChluIPFS
 * instance with all the exposed calls faked and no internals. These faked
 * calls always resolve, and the async ones do so after a short delay to simulate
 * real activity. Use this for testing your UI during development
 * @param {string} options.directory where to store all chlu-ipfs data, defaults to ~/.chlu
 * @param {Object} options.logger custom logger if you want to override the default. Needs
 * error, warn, info and debug methods which will be called with one string argument
 * @param {boolean} options.enablePersistance default true. If false, does not persist Chlu specific
 * data. This will not disable IPFS and OrbitDB persistence
 */
class ChluIPFS {

    constructor(options = {}){
        if (options.mock) {
            this.instance = new ChluIPFSMock(options);
        } else {
            this.instance = new ChluIPFSImpl(options);
        }
    }
    
    /**
     * Get the address of this Customer's OrbitDB
     * database (used to index review updates)
     * 
     * @returns {string}
     */
    getOrbitDBAddress(){
        return this.instance.getOrbitDBAddress();
    }
    
    /**
     * Start subsystems. Call this before any ChluIPFS operations
     * but after you made any change to the internal modules or
     * configurations.
     * 
     * @returns {Promise} resolves when fully ready
     */
    async start(){
        return await this.instance.start();
    }

    /**
     * Stop all subsystems. Use this to stop gracefully
     * before exiting from a Node.js process
     * 
     * @returns {Promise} resolves when fully stopped
     */
    async stop() {
        return await this.instance.stop();
    }

    async waitUntilReady() {
        return await this.instance.waitUntilReady();
    }

    /**
     * Change this node to a new ChluIPFS type. Works
     * when started or stopped.
     * 
     * @param {string} newType
     */
    async switchType(newType) {
        return await this.instance.switchType(newType);
    }

    /**
     * Recursively Pin arbitrary multihashes. Falls back to a
     * shallow (non recursive) fetch with a warning if the underlying
     * IPFS node does not support pinning
     * 
     * @param {string} multihash
     * @returns {Promise} resolves when the pinning process has completed
     */
    async pin(multihash){
        // TODO: tests for this (it was broken)
        return await this.instance.pinning.pin(multihash);
    }

    /**
     * Reads the review record at the given multihash.
     * Returns the review record decoded into a javascript object
     * 
     * The options object optionally accepts:
     * 
     * 
     * @returns {Promise} resolves to the review record
     * @param {string} multihash 
     * @param {Object} options optional additional preferences
     * @param {boolean} options.validate whether to check for validity (default true). Throws if the review record is invalid
     * @param {Function} options.checkForUpdates default false, if true will emit 'updated ReviewRecords' events when this RR is updated
     * requested review record
     */
    async readReviewRecord(multihash, options = {}){
        return await this.instance.readReviewRecord(multihash, options);
    }

    /**
     * Takes a fully compiled review record except for fields that will be autofilled
     * such as the internal hash. The review record is checked for validity before
     * being written to IPFS.
     * 
     * @returns {string} multihash the multihash of the RR stored in IPFS
     * @param {Object} reviewRecord as a javascript object
     * @param {Object} options optional additional preferences
     * @param {boolean} options.validate default true, check for validity before writing. Throws if invalid
     * @param {boolean} options.publish default true, when false the RR is not shared with the Chlu network
     * and not advertised to other nodes
     * @param {string} options.previousVersionMultihash set this if you want this RR to be an update of an
     * old one previously published
     */
    async storeReviewRecord(reviewRecord, options = {}){
        return await this.instance.storeReviewRecord(reviewRecord, options);
    }

    async exportData() {
        return await this.instance.exportData();
    }

    async importData(exportedData) {
        return await this.instance.importData(exportedData);
    }

    async getVendorKeys(ipnsName) {
        return await this.instance.getVendorKeys(ipnsName);
    }
    
    async publishKeys(publicEncKey, publicSigKey) {
        return await this.instance.publishKeys(publicEncKey, publicSigKey);
    }
}

module.exports = Object.assign(ChluIPFS, constants);