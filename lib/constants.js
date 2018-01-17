'use strict';

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
    customerDbName: 'chlu-experimental-customer-review-updates',
    pubsubRoom: 'chlu-experimental'
};