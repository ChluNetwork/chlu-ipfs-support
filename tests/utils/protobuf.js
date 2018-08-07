
function getFakeReviewRecord() {
    return {
        currency_symbol: 'tBTC',
        amount: 100013,
        customer_address: 'customer_address',
        vendor_address: 'vendor_address',
        issued: 0,
        issuer: 'did:chlu:rando',
        subject: {
            did: 'did:chlu:vendor',
            address: '',
            categories: [],
            location: null,
            name: '',
            telephone: '',
            url: ''
        },
        platform: {
            name: 'Chlu',
            subject_url: '',
            url: 'https://chlu.io'
        },
        author: {
            name: 'Test',
            platform_url: ''
        },
        review: {
            date_published: 0,
            title: 'My Review',
            text: 'it was a really nice item',
            url: ''
        },
        rating_details: {
            min: 0,
            max: 0,
            value: 0
        },
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
            signature: {
                type: 'did:chlu',
                nonce: '',
                created: 0,
                creator: 'did:chlu:rando',
                signatureValue: ''
            },
            marketplace_signature: {
                type: 'did:chlu',
                nonce: '',
                created: 0,
                creator: 'did:chlu:rando',
                signatureValue: ''
            },
            vendor_signature: {
                type: 'did:chlu',
                nonce: '',
                created: 0,
                creator: 'did:chlu:vendor',
                signatureValue: ''
            },
            vendor_did: 'did:chlu:vendor',
        },
        last_reviewrecord_multihash: '',
        chlu_version: 0,
        hash: '',
        issuer_signature: {
            type: 'did:chlu',
            nonce: '',
            created: 0,
            creator: 'did:chlu:rando',
            signatureValue: ''
        },
        customer_signature: {
            type: 'did:chlu',
            nonce: '',
            created: 0,
            creator: 'did:chlu:rando',
            signatureValue: ''
        },
        verifiable: true,
        verification: null
    };
}

function makeResolved(reviewRecord) {
    if (reviewRecord.popr) {
        reviewRecord.popr.resolved = true
    }
    if (!Array.isArray(reviewRecord.history)) reviewRecord.history = []
    reviewRecord.resolved = true
    return reviewRecord
}

function makeUnverified(reviewRecord) {
    // Remove payment info
    reviewRecord.amount = 0
    reviewRecord.customer_address = ''
    reviewRecord.vendor_address = ''
    // Remove PoPR
    reviewRecord.popr = null
    // Remove verification info
    reviewRecord.verifiable = false
    reviewRecord.verification = null
    // Remove customer signature
    reviewRecord.customer_signature = null
    return reviewRecord
}

module.exports = { getFakeReviewRecord, makeUnverified, makeResolved };