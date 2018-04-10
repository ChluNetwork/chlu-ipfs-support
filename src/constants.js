
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
    chluBootstrapNodes: {
        nodeJs: [
            '/ip4/127.0.0.1/tcp/4003/ws/ipfs/QmZ8uomcZCT4z4y5b1YzbSBrKvXb72TmFf1oS3z5NPELTo',
            // go-ipfs running on EC2
            '/dns4/replicator.chlu.io/tcp/4001/ipfs/QmYkctX9Wg5g2mBD8mnnNiCQE5toy3RqAkmzAmGEXY4dVU',
            '/dns4/replicator.chlu.io/tcp/443/wss/ipfs/QmYkctX9Wg5g2mBD8mnnNiCQE5toy3RqAkmzAmGEXY4dVU',
            // a go-ipfs node with relay-hop
            '/ip4/5.189.146.239/tcp/4001/ipfs/QmSQZrsqarpjGnw3Ey1ZRwCjCBBpiJTKivENsePVWMKaho',
            // js-ipfs Service Node running on EC2
            // '/p2p-circuit/ipfs/QmdHqyJAXPModr2omDhLt5HifHGZFdCfZyhkD74jiAKyzd',
        ],
        browser: [
            // go-ipfs running on EC2
            '/dns4/replicator.chlu.io/tcp/443/wss/ipfs/QmYkctX9Wg5g2mBD8mnnNiCQE5toy3RqAkmzAmGEXY4dVU',
            // a go-ipfs node with relay-hop
            // TODO: configure that node to accept WSS connections
            // js-ipfs Service Node running on EC2
            // '/p2p-circuit/ipfs/QmdHqyJAXPModr2omDhLt5HifHGZFdCfZyhkD74jiAKyzd',
        ]
    }
};