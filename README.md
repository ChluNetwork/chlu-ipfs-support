# Chlu IPFS Support

This is a work in progress implementation of the IPFS integration of [Chlu](https://chlu.io).

See [CONTRIBUTING.md](https://github.com/ChluNetwork/chlu-ipfs-support/blob/master/CONTRIBUTING.md) to hack on the code.

## Usage

This module has not been released to NPM yet. Check out [index.js](https://github.com/ChluNetwork/chlu-ipfs-support/blob/master/src/index.js) to see the exposed API calls,
read the API docs linked below or check out the examples.

### In Node

Just require this module, then check out the JS API Docs below for usage information.

### In the Browser

You can require/import this module from the browser through Webpack. Check out [this example](https://github.com/ipfs/js-ipfs/tree/master/examples/browser-webpack) for the additional configuration needed by js-ipfs.

__If you use create-react-app__ and don't want to eject, there is an issue preventing you from using IPFS or any library that
depends on IPFS because the IPFS code is not transpiled to ES5 and the uglify version used by create-react-app as of now
does not support ES6 code and crashes when encountering it. This will prevent you from making a production build of your
app, but thankfully there is a [workaround you can use](https://github.com/facebook/create-react-app/issues/2108#issuecomment-347623672):
be careful to remove `-c` and `-m` options from the uglify-es call since they don't play well with IPFS.

For more information either check how we are building [chlu-demo](https://github.com/ChluNetwork/chlu-demo) or open an issue.

__If you don't have webpack__, we also have a prebuilt minified version of the library that you can include in a `<script>` tag.
Check out the [examples](https://github.com/ChluNetwork/chlu-ipfs-support/blob/master/examples).

### In Electron

This is not supported right now, however everything should work if you follow the browser instructions and only run ChluIPFS in the renderer process of electron.
Keep in mind that you will run into the same limitations of running ChluIPFS in the browser, and that this is not tested.

### Running a Service Node

You can install this module globally and use `chlu-service-node start` to run a (barebones) Chlu Service Node. The binary will probably be moved in a different repository in the future.

If you want to run it on a custom network, use `chlu-service-node start --network <custom>`, otherwise it runs on the `experimental` network (used in development) by default.

The only other network in use is the `staging` network, used by our official demo at [demo.chlu.io](https://demo.chlu.io)

In the examples folder you can find out how to run a Service Node in a browser tab although this won't be a good idea outside of testing.

### Running Offline

You can start the service node with `chlu-service-node start --offline`. Other apps using chlu-ipfs on the same
machine should detect the service node in offline mode and enter offline mode as well, making sure all of your Chlu
apps on your machine will talk to each other even if you are completely disconnected.

## JS API Docs

https://ipfs.io/ipfs/QmTHQog37CpVHrdwWt1EpS8feymig8N2RpoTBY66P9D8cE

### Events

You can access the event emitter at `chluIpfs.instance.events` and listen to some events:

- Lifecycle
  - `chlu-ipfs/starting`, `chlu-ipfs/ready`, `chlu-ipfs/stopping`, `chlu-ipfs/stopped` are self explanatory
  - `chlu-ipfs/error` generic internal non-fatal error. Mostly used for weird cases and debugging
- OrbitDB (check out orbit-db docs for more information)
  - `db/replicate` called with `address` to signal that a DB has started replicating from another peer
  - `db/replicate/progress`
  - `db/replicated` when the replication is finished
- Persistence
  - `persistence/saved` after saving Chlu specific information
  - `persistence/loaded` after loading Chlu specific information
- Pinning
  - `pin/pinning` when starting a pin, called with `multihash`
  - `pin/pinned` after finishing a pin, called with `multihash`
  - `pin/error` when a pin operation goes wrong
- Review Records
  - `reviewrecord/updated` when an update to a review record is discovered.
  Called with:
    - `multihash` the multihash of the review record that has been updated
    - `updatedMultihash` the multihash of the new version that has just been discovered
    - `reviewRecord` the new version of the review record. The RR is already validated, otherwise the event
    would not have been emitted
  - `reviewrecord/read` when a review record is read
  - `reviewrecord/stored` when a review record is stored (not necessarily published)
  - `reviewrecord/published` when a review record is published
- Validation
  - `validation/error` to keep track of invalid review records
- Discovery
  - `discover/dids/vendor` to keep track of vendors encountered. Only emitted if the RR containing it is valid
  - `discover/keys/vendor-marketplace` Only emitted if the RR containing it is valid
  - `discover/dids/marketplace` to keep track of marketplaces encountered. Only emitted if the RR containing it is valid
  - `discover/dids/customer` only emitted if a customer signed RR containing it is valid
- PubSub
  - `pubsub/subscribed`
  - `pubsub/unsubscribed`
  - `pubsub/message` you can use this to listen to all Chlu chatter on pubsub
  - `pubsub/error`
  - `pubsub/peer/joined` called with IPFS peer ID
  - `pubsub/peer/left` called with IPFS peer ID

## Examples

```javascript
// Create a ChluIPFS node
const chluIpfs = new ChluIPFS()
// Start the node. It is possible to modify internal modules or set an existing IPFS instance
// to be used while the node has not been started yet
await chluIpfs.start() // this operation is async. Wait for the promise to resolve before doing anything else
// ChluIPFS logs to console in debug level by default. Pass a custom logger object to the constructor to
// change this behavior. The methods that the logger should contain are error, warn, info and debug
```

Also check out the [browser examples](https://github.com/ChluNetwork/chlu-ipfs-support/blob/master/examples)

## Undocumented differences from the protocol

This is a collection of features and design choices not compatible with the Chlu Protocol. They exist to allow this to work before the protocol is finalized.

Chlu Service Nodes:

- chlu service nodes listen for chlu events and take actions to help replicate data. The events are written to IPFS Pubsub
- the review history and pointers to new versions are kept in a custom OrbitDB Store

Writing Reviews:

- when a review is written, the API will not return until a service node has replied saying it successfully pinned the review
- an OrbitDB database with a custom store is used to write all new review records and all updates

All of these are subject to change.