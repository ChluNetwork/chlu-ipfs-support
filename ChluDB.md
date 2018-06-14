# ChluDB

This is a specification for the ChluDB interface that is used to provide this Chlu implementation
with a storage engine for writing and reading Chlu data. This datastore can be whatever system,
as long as it respects this specification when responding to calls.

## Data structures

### Review Record

- MUST have a `multihash` with the IPFS multihash of the review record. This is the unique identifier
- the review record contains the full PoPR
- if `previous_version_multihash` is present, the review record is an update
- ALWAYS keep track of old versions of review records

### DID Document

- MUST have an `id` field. This is the unique identifier
- it's not needed to track old DID revisions (for now)

## Functions

These are the functions that a ChluDB implementation must provide

### Notes

- `put` functions MUST replace existing content with the same unique identifier
- `add` functions MUST be idempotent and do nothing if content with the same identifier is already there

### Signatures

```javascript

// Review Records

async function addReviewRecord(multihash, reviewRecord) {
    // resolves promise when the data is ready to be read
}

async function getLatestReviewRecordUpdate(reviewRecordMultihash) {
    // returns the latest version of the review record given and its multihash
}

async function getOriginalReviewRecord(reviewRecordMultihash) {
    // returns the first version of the review record given and its multihash
}

async function getNextReviewRecordVersion(reviewRecordMultihash) {
    // returns the next version (if any) of the review record given and its multihash
}

async function getPreviousReviewRecordVersion(reviewRecordMultihash) {
    // returns the previous version (if any) of the review record given and its multihash
}

// offset: how many items to skip
// limit: how many items to return
async function getReviewRecordList(offset, limit) {
    // returns a list of all review records known ordered by time of discovery
}

async function getReviewRecordCount() {
    // returns an integer
}

// DID

async function putDID(multihash, didDocument) {
    // resolves promise when the data is ready to be read
}

async function getDID(didId) {
    // returns the DID document and its multihsah

}

// Imported Centralised Reputation

// TODO: need to find a way to generate a unique identifier for imported reviews
async function addCrawledReviews(didId, reviews) {
    // resolves promise when the data is ready to be read
}

async function getReputationFor(didId) {
    // resolves promise when the data is ready to be read
}

```