const ChluIPFS = require('./ChluIPFS');
const ChluIPFSMock = require('./ChluIPFS.mock');
const constants = require('./constants');

class ChluIPFSAPI {

    constructor(options = {}){
        if (options.mock) {
            this.instance = new ChluIPFSMock(options);
        } else {
            this.instance = new ChluIPFS(options);
        }
    }
    
    getOrbitDBAddress(){
        return this.instance.getOrbitDBAddress();
    }
    
    async start(){
        return await this.instance.start();
    }

    async stop() {
        return await this.instance.stop();
    }

    async switchType(newType) {
        return await this.instance.switchType(newType);
    }

    async pin(multihash){
        return await this.instance.pin(multihash);
    }

    async readReviewRecord(multihash){
        return await this.instance.readReviewRecord(multihash);
    }

    async storeReviewRecord(reviewRecord){
        return await this.instance.storeReviewRecord(reviewRecord);
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

    async publishUpdatedReview(updatedReview) {
        return await this.instance.publishUpdatedReview(updatedReview);
    }
}

module.exports = Object.assign(ChluIPFSAPI, constants);