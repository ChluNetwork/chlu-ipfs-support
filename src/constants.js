
module.exports = {
    types: {
        customer: 'customer',
        vendor: 'vendor',
        marketplace: 'marketplace',
        service: 'service'
    },
    eventTypes: {
        unknown: 'UNKNOWN',
        pinning: 'PINNING',
        pinned: 'PINNED',
        wroteReviewRecord: 'WROTE_REVIEW_RECORD',
        updatedReview: 'UPDATED_REVIEW',
        customerReviews: 'CUSTOMER_REVIEWS',
        replicating: 'REPLICATING',
        replicated: 'REPLICATED'
    },
    networks: {
        // default is the production network
        default: 'default',
        // staging is the demo network
        staging: 'staging',
        // experimetnal is the development network
        experimental: 'experimental'
    },
    defaultIPFSOptions:  {
        // ipfs
        EXPERIMENTAL: {
            pubsub: true,
            relay: {
                enabled: true, // enable this to use relays to connect to nodes
                hop: {
                    enabled: false // disable this, we don't want to act as relay to save bandwidth
                }
            }
        },
        // ipfs-api
        host: 'localhost',
        port: 5001,
        protocol: 'http'
    },
    defaultSwarmAddresses: {
        nodeJs: [
            // This is the main way to receive incoming connections from other non-browser nodes
            '/ip4/0.0.0.0/tcp/4002',
            // WS is only useful to connect from browsers via WSS (using a proxy) so localhost is ok
            '/ip4/127.0.0.1/tcp/4003/ws',
        ],
        browser: [
            // We can't listen for connections in the browser
        ],
        rendezvous: [
            // Helps browser connectivity, until circuit relay can replace this
            '/dns4/ws-star-signal-2.servep2p.com/tcp/443/wss/p2p-websocket-star'
        ]
    },
    chluBootstrapNodes: {
        nodeJs: [
            // go-ipfs running on EC2 (TCP)
            '/dns4/replicator.chlu.io/tcp/4001/ipfs/QmYkctX9Wg5g2mBD8mnnNiCQE5toy3RqAkmzAmGEXY4dVU',
            // js-ipfs running on EC2 (TCP) with relay-hop
            '/dns4/replicator.chlu.io/tcp/4002/ipfs/QmS28JK6YhwTEVwwbyeoDtNuan5Z5TxgfBY4eWEK7CirqQ',
            // js-ipfs running on EC2 (WSS) with relay-hop
            '/dns4/replicator.chlu.io/tcp/443/wss/ipfs/QmS28JK6YhwTEVwwbyeoDtNuan5Z5TxgfBY4eWEK7CirqQ',
            // a go-ipfs node (TCP) with relay-hop
            '/ip4/5.189.146.239/tcp/4001/ipfs/QmSQZrsqarpjGnw3Ey1ZRwCjCBBpiJTKivENsePVWMKaho',
        ],
        browser: [
            // js-ipfs running on EC2 (WSS) with relay-hop
            '/dns4/replicator.chlu.io/tcp/443/wss/ipfs/QmS28JK6YhwTEVwwbyeoDtNuan5Z5TxgfBY4eWEK7CirqQ',
            // a go-ipfs node (WSS) with relay-hop
            // TODO: configure QmSQZrsqarpjGnw3Ey1ZRwCjCBBpiJTKivENsePVWMKah node to accept WSS connections
        ]
    }
};