
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
    orbitDbName: 'chlu-experimental',
    pubsubTopic: 'chlu-experimental',
    networks: {
        // default is the production network
        default: 'default',
        // staging is the demo network
        staging: 'staging',
        // experimetnal is the development network
        experimental: 'experimental'
    },
    ipfsTypes: {
        remote: 'REMOTE', // connect to external running node
        go: 'GO' // start a go-ipfs node (TODO: implement this)
        // no type (default): start a js node in the same process
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
    chluBootstrapNodes: [
        // '/dns4/ws-star-signal-1.servep2p.com/wss/p2p-websocket-star/ipfs/',
        '/ip4/5.189.146.239/tcp/4001/ipfs/QmSQZrsqarpjGnw3Ey1ZRwCjCBBpiJTKivENsePVWMKaho',
        '/p2p-circuit/QmdHqyJAXPModr2omDhLt5HifHGZFdCfZyhkD74jiAKyzd', // Service Node running on EC2
    ]
};