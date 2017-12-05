
class ChluIPFS {

    constructor() {
        this.events = {};
        this.ipfs = {};
        this.db = {};
        this.type = null;
    }
    
    async start(){
        return true;
    }

    async stop() {
        return true;
    }

    async pin(multihash){
        return multihash;
    }

    getOrbitDBAddress(){
        return 'mockedorbitdbaddress';
    }

    async storeReviewRecord(reviewRecord){
        return 'mockedRRmultihash';
    }

    async exportData() {
        return {};
    }

    async importData() {
    }

    async getVendorKeys(ipnsName) {
        return { pubenc: 'mockedpubenckey', pubsig: 'mockedpubsigkey' };
    }
    
    async publishKeys(publicEncKey, publicSigKey) {
        return 'mocketkeysmultihash';
    }

    async publishUpdatedReview(updatedReview) {
    }
}

module.exports = ChluIPFS;