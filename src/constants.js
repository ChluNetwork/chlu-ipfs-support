
module.exports = {
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
            pubsub: true, // REQUIRED for chlu to work
            relay: {
                enabled: false, // enable this to use relays to connect to nodes
                hop: {
                    enabled: false, // enable this to act as relay
                    active: false // enable this to make this node try to dial destination peers for relay connections
                }
            }
        },
        preload: {
            // Disable this as the preload servers aren't reachable with the default configuration
            enabled: false
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
            // Helps browser connectivity, until circuit relay + DHT can replace this
            '/dns4/ren.chlu.io/tcp/443/wss/p2p-websocket-star'
        ]
    },
    localRendezvousAddress: '/ip4/127.0.0.1/tcp/13580/ws/p2p-websocket-star',
    rendezvousPorts: {
        default: 13579,
        local: 13580,
        test: 13581,
        wss: 443
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
    },
    orbitDb: {
        storeType: 'chlu'
    },
    validator: {
        allowedUnverifiedReviewIssuers: [
            // Chlu Publish API Server at https://publish.chlu.io
            'did:chlu:HyJ5MBzj3ccpejbcZToEKRwxgu9hcMA28j8SoH1135Gi'
        ]
    }
};