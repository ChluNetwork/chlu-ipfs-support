# Chlu IPFS Support

This is a work in progress implementation of the IPFS integration of [Chlu](https://chlu.io).

See [CONTRIBUTING.md](https://github.com/ChluNetwork/chlu-ipfs-support/blob/master/CONTRIBUTING.md) to hack on the code.

## Usage

This module has not been release to NPM yet. Check out [index.js](https://github.com/ChluNetwork/chlu-ipfs-support/blob/master/src/index.js) to see the exposed API calls.

### In Node

If you are in development mode, you can pass an option `mock: true` when initializing the class to get a fake API that returns example data.

### In the Browser

You can require/import this module from the browser through Webpack. Check out [this example](https://github.com/ipfs/js-ipfs/tree/master/examples/browser-webpack) for the additional configuration needed by js-ipfs.

If you don't have webpack, we also have a prebuilt minified version of the library that you can include in a `<script>` tag. Check out the [examples](https://github.com/ChluNetwork/chlu-ipfs-support/blob/master/examples).

### In Electron

This is not supported right now, however everything should work if you follow the browser instructions and only run ChluIPFS in the renderer process of electron.
Keep in mind that you will run into the same limitations of running ChluIPFS in the browser, and that this is not tested.

### Running a Service Node

You can install this module globally and use `chlu-service-node` to run a (barebones) Chlu Service Node. The binary will probably be moved in a different repository in the future.

In the examples folder you can find out how to run a Service Node in a browser tab although this won't be a good idea outside of testing.

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