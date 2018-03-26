
function getFakeReviewRecord() {
    return {
        currency_symbol: 'USD',
        amount: 100013,
        customer_address: 'customer_address',
        vendor_address: 'vendor_address',
        review_text: 'it was a really nice item',
        rating: 4,
        detailed_review: [],
        popr: {
            item_id: 'item_id',
            invoice_id: 'invoice_id',
            customer_id: 'customer_id',
            created_at: 12345,
            expires_at: 34567,
            currency_symbol: 'USD',
            amount: 100013,
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
            signature: '',
            vendor_key_location: '',
            vendor_encryption_key_location: '',
            marketplace_signature: '',
            vendor_signature: ''
        },
        orbitDb: '/orbitdb/ipfshash/chlu-experimental-customer-review-updates',
        last_reviewrecord_multihash: '',
        chlu_version: 0,
        hash: '',
        signature: '',
        key_location: ''
    };
}

module.exports = { getFakeReviewRecord };