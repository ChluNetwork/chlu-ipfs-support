const constants = require('./constants');
const time = require('./utils/timing');
const { getFakeReviewRecord } = require('../tests/utils/protobuf');

class ChluIPFS {

    constructor(options = {}) {
        if (Object.values(constants.types).indexOf(options.type) < 0) {
            throw new Error('Invalid type');
        }
        this.type = options.type;
        if (options.fakeWait !== undefined) {
            this.fakeWait = options.fakeWait;
        } else {
            this.fakeWait = true;
        }
    }

    async _wait(ms) {
        if (this.fakeWait) await time.milliseconds(ms);
    }
    
    async start(){
        await this._wait(1000);
        return true;
    }

    async stop(){
        await this._wait(1000);
        return true;
    }
    
    async switchType(type){
        await this._wait(1000);
        this.type = type;
    }

    async pin(){
        await this._wait(3000);
    }

    getOrbitDBAddress(){
        return 'mockedorbitdbaddress';
    }

    async readReviewRecord(){
        await this._wait(3000);
        return await getFakeReviewRecord();
    }

    async storeReviewRecord(){
        await this._wait(3000);
        return 'mockedRRmultihash';
    }

    async exportData() {
        await this._wait(1000);
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
        await this._wait(1000);
    }

    async getVendorKeys() {
        await this._wait(5000);
        return { pubenc: 'mockedpubenckey', pubsig: 'mockedpubsigkey' };
    }
    
    async publishKeys() {
        await this._wait(3000);
        return 'fakekeysmultihash';
    }
}

module.exports = Object.assign(ChluIPFS, constants);