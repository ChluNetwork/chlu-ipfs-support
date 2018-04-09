
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
    defaultIPFSOptions:  {
        EXPERIMENTAL: {
            pubsub: true
        },
        config: {
            Addresses: {
                Swarm: [
                    '/dns4/ws-star-signal-2.servep2p.com/tcp/443/wss/p2p-websocket-star'
                ]
            }
        }
    }
};