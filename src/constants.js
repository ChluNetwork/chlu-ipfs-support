
module.exports = {
    types: {
        customer: 'CUSTOMER',
        vendor: 'VENDOR',
        marketplace: 'MARKETPLACE',
        service: 'SERVICE'
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
    customerDbName: 'chlu-experimental-customer-review-updates',
    pubsubRoom: 'chlu-experimental'
};