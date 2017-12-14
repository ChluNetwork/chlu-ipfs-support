const constants = require('./constants');
const time = require('./utils/timing');

class ChluIPFS {

    constructor(options = {}) {
        if (Object.values(constants.types).indexOf(options.type) < 0) {
            throw new Error('Invalid type');
        }
        this.type = options.type;
    }
    
    async start(){
        await time.milliseconds(1000);
        return true;
    }

    async stop(){
        await time.milliseconds(1000);
        return true;
    }

    async pin(){
        await time.milliseconds(3000);
    }

    getOrbitDBAddress(){
        return 'mockedorbitdbaddress';
    }

    async storeReviewRecord(){
        await time.milliseconds(3000);
        return 'mockedRRmultihash';
    }

    async exportData() {
        await time.milliseconds(1000);
        if (this.type === constants.types.customer) {
            return {
                customerDbKeys: {
                    pub: 'examplePublicKey',
                    priv: 'examplePrivateKey'
                }
            };
        }
        return {};
    }

    async importData() {
        await time.milliseconds(1000);
    }

    async getVendorKeys() {
        await time.milliseconds(5000);
        return { pubenc: 'mockedpubenckey', pubsig: 'mockedpubsigkey' };
    }
    
    async publishKeys() {
        await time.milliseconds(3000);
        return 'fakekeysmultihash';
    }

    async publishUpdatedReview() {
        await time.milliseconds(5000);
    }
}

module.exports = Object.assign(ChluIPFS, constants);