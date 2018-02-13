# Chlu IPFS Support

This is a work in progress implementation of the IPFS integration of [Chlu](https://chlu.io).

See [CONTRIBUTING.md](https://github.com/ChluNetwork/chlu-ipfs-support/blob/master/CONTRIBUTING.md) to hack on the code.

## Usage

This module has not been release to NPM yet. Check out [index.js](https://github.com/ChluNetwork/chlu-ipfs-support/blob/master/src/index.js) to see the exposed API calls.

### In Node

If you are in development mode, you can pass an option `mock: true` when initializing the class to get a fake API that returns example data.

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

You can install this module globally and use `chlu-service-node` to run a (barebones) Chlu Service Node. The binary will probably be moved in a different repository in the future.

In the examples folder you can find out how to run a Service Node in a browser tab although this won't be a good idea outside of testing.

## API Docs

https://ipfs.io/ipfs/QmYjfSPRcqKeRiJ7Es1qfnfgADSAvM1CApJyZdXhfpDqjs

## Examples

```javascript
// Create a ChluIPFS node of type service
// available types: service, customer, vendor, marketplace
// only service and customer are implemented. Use service for Service Nodes and customer for writing Chlu Reviews
const chluIpfs = new ChluIPFS({ type: ChluIPFS.types.service })
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

- chlu service nodes listen for chlu events and take actions to help replicate data. The events are written into the pubsub-room "chlu-experimental"
- they react to review updates by pinning the review after verifying the validity
- they replicate the customers' orbitDbs

Writing Reviews:

- when a review is written, the API will not return until a service node has replied saying it successfully pinned the review

Updating Reviews:

- the implementation uses an OrbitDB key value store for every customer that wishes to update his review
- for each update, an entry is created in the kvstore with the mulithash of the old version as key and the multihash of the update as value
- the orbitDb address is embedded into the ReviewRecords using the `orbitDb` field