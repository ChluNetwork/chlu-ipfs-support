
function getFakeReviewRecord() {
    return {
        popr: {
            item_id: 'item_id',
            invoice_id: 'invoice_id',
            customer_id: 'customer_id',
            created_at: 'created_at',
            expires_at: 'expires_at',
            currency_symbol: '$',
            amount: 1000.13,
            marketplace_url: 'chlu.io',
            marketplace_vendor_url: 'chlu.io',
            key_location: '/ipfs/url',
            chlu_version: 0,
            attributes: [
                {
                    name: 'score',
                    min_rating: 1,
                    max_rating: 5,
                    description: 'rating',
                    is_required: true
                }
            ],
            signature: '-'
        },
        currency_symbol: '$',
        amount: 1000.13,
        customer_address: 'customer_address',
        vendor_address: 'vendor_address',
        review_text: 'it was a really nice item',
        rating: 4,
        chlu_version: 0,
        hash: '-'
    };
}

module.exports = { getFakeReviewRecord };