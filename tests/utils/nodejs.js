const rendezvous = require('libp2p-websocket-star-rendezvous');

async function startRendezvousServer() {
    return new Promise((fullfill, reject) => {
        rendezvous.start({ port: 13579 }, (err, srv) => err ? reject(err) : fullfill(srv));
    });
}

module.exports = { startRendezvousServer };