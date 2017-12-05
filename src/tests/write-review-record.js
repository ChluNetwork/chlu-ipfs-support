const ChluIPFS = require('../index.js');
const Repo = require('ipfs-repo');
const repo = new Repo('/tmp/ipfs-repo');

let customerNode = null;

async function main(){
    console.log('Creating Mock Chlu Customer Node');
    customerNode = new ChluIPFS({ type: ChluIPFS.types.customer, ipfs: { repo } });
    console.log('Starting Chlu IPFS');
    await customerNode.start();
    console.log('Writing a mock Review Record and awaiting response');
    const reviewRecord = Buffer.from('Mock Review Record: ' + String(Math.random() + Date.now()));
    try {
        customerNode.room.on('peer joined', (peer) => {
            console.log('Peer joined the room', peer);
        });
    
        customerNode.room.on('peer left', (peer) => {
            console.log('Peer left...', peer);
        });
        await customerNode.storeReviewRecord(reviewRecord);
    } catch (exception) {
        console.trace();
        console.log('Error:', exception.message);
    }
}

main().then(async () => {
    console.log('Completed Successfully, stopping node');
    try {
        if (customerNode) await customerNode.stop();
    } catch (exception) {
        console.log('Error while closing:', exception.message);
        console.trace();
        process.exit(1);
    }
    process.exit(0);
});