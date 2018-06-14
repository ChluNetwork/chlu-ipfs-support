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

## Functions

These are the functions that a ChluDB implementation must provide

### Notes

- `put` functions MUST replace existing content with the same unique identifier
- `add` functions MUST be idempotent and do nothing if content with the same identifier is already there

### Signatures

```javascript

// Writing Review Records

async function addReviewRecord(multihash, reviewRecord)

// Reading Review Records

async function getLatestReviewRecordUpdate(reviewRecordMultihash)

async function getOriginalReviewRecord(reviewRecordMultihash)

async function getNextReviewRecordVersion(reviewRecordMultihash)

async function getPreviousReviewRecordVersion(reviewRecordMultihash)

async function getReviewRecordList(offset, limit)

async function getReviewRecordCount()

// DID

async function putDID(multihash, didDocument)

async function getDID(didId)

// Imported Centralised Reputation

async function addCrawledReviews(didId, reviews)

```