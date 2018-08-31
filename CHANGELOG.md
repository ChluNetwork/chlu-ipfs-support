# Chlu IPFS Changelog

## v0.3.0

- getReviewsWrittenByDID and getReviewsAboutDID now return `{ count, rows }` instead of just the rows array
- fixed limit and offset not being passed to Chlu OrbitDB Index

## v0.2.5

- fixed bug introduced in previous release

## v0.2.4

- changed default timeout for publishing to be 60 seconds with retries every 5 seconds
- allowed custom timeout parameters to be passed when publishing a review record

## v0.2.3

- added `isPinned` API, which can tell if content is already pinned
- added `broadcast` parameter to `pin` API, defaults to true. Set to false to disable broadcasting messages about the pin

## v0.2.2

- improved discover events, they now pass additional detailed data
- fix publish of DIDs always happening even if the DID was already published
- improve transaction validation process and errors
- waiting for replication when publishing a review record or DID now waits for a Remote Pin event

## v0.2.1

- slightly improve error handling and logging
- disable IPFS preloading

## v0.2.0 "ChluDB"

- properly validate DID submissions and Reviews coming out of OrbitDB
- added support for SQL Database as a backend for OrbitDB: supports SQLite or PostgreSQL
- added ability to disable writes to the ChluDB for users that run multiple Chlu services and only want the collector to write to the DB
- sped up reads when using the SQL ChluDB: if the implementation chosen "caches" additional informations, it won't have to be refetched and revalidated again
- IPFS read operations will now time out if they take too long instead of getting stuck forever

## v0.1.1 (Latest Release)

- fixed Chlu dependencies versions from git branches to git tags

## v0.1.0

- unverified reviews are no longer editable
- removed Mock API
- removed types and the switchType function
- publishing DIDs now includes a signature which is checked on getDID
- various minor changes to APIs

## Protobuf Upgrade (unreleased)

- added support for unverified reviews
- switched to new review format
- added support for importing unverified reviews
- exposed new APIs