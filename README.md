# Chlu IPFS Support

This is a work in progress implementation of the IPFS integration of [Chlu](https://chlu.io).

See [CONTRIBUTING.md](https://github.com/ChluNetwork/chlu-ipfs-support/blob/master/CONTRIBUTING.md) to hack on the code.

## Usage

This module has not been release to NPM yet. You can however install it and import/require it, but it's still WIP. Check out [index.js](https://github.com/ChluNetwork/chlu-ipfs-support/blob/master/src/index.js) to see the available API calls, and the tests for examples.

You can install this module globally and use `chlu-service-node` to run a Chlu Service Node.

If you are in development mode, you can pass an option `mock: true` when initializing the class to get a fake API that returns example data.

### Browser

You can use this module from the browser through webpack. Check out [this example](https://github.com/ipfs/js-ipfs/tree/master/examples/browser-webpack) for the additional configuration needed by js-ipfs.

### Undocumented differences from the protocol

This is a collection of features and design choices not compatible with the Chlu Protocol. They exist to allow this to work before the protocol is finalized.

Chlu Support Nodes:

- chlu support nodes listen for chlu events and take actions to help the stability of the network. The events are written into the pubsub-room "chlu-experimental"
- they react to review updates by pinning the review
- they replicate the customers' orbitDbs

Writing Reviews:

- when a review is written, the API will not return until a service node has replied saying it successfully pinned the review

Updating Reviews:

- the implementation uses an OrbitDB feed for every customer that wishes to update his reviews