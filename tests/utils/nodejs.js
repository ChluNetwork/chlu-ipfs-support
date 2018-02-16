const rendezvous = require('libp2p-websocket-star-rendezvous');

async function startRendezvousServer() {
    return new Promise((resolve, reject) => {
        rendezvous.start({ port: 13579 }, (err, srv) => err ? reject(err) : resolve(srv));
    });
}

module.exports = { startRendezvousServer };