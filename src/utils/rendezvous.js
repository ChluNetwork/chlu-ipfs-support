const rendezvous = require('libp2p-websocket-star-rendezvous');

async function startRendezvousServer(port = 13579) {
    return new Promise((resolve, reject) => {
        rendezvous.start({ port }, (err, srv) => err ? reject(err) : resolve(srv));
    });
}

module.exports = {
    startRendezvousServer
};