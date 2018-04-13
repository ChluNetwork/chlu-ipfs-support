#!/usr/bin/env node
const ChluIPFS = require('../src/index.js');
const cli = require('commander');
const package = require('../package.json');

let serviceNode = null;

function handleErrors(fn) {
    return function (...args) {
        fn(...args).catch(err => {
            console.log(err);
            console.trace(err);
            process.exit(1);
        });
    };
}

async function start(options){
    console.log('Starting Chlu IPFS Service Node');
    const config = {
        type: ChluIPFS.types.service,
        network: options.network || ChluIPFS.networks.experimental,
        directory: options.directory,
        ipfs: {
            remote: options.externalIpfs,
            enableRelayHop: options.relay
        },
        listen: options.listen,
        useCircuit: options.circuit || options.relay,
        useRendezvous: options.rendezvous
    };
    serviceNode = new ChluIPFS(config);
    await serviceNode.start();
    console.log('Chlu Service node ready');
}

process.on('SIGINT', async function() {
    console.log('Stopping gracefully');
    try {
        if (serviceNode) {
            await serviceNode.stop();
        }
        process.exit(0);
    } catch(exception) {
        process.exit(1);
    }
});


cli
    .name('chlu-service-node')
    .description('Reference implementation of the Chlu Service Node. http://chlu.io')
    .version(package.version);

cli
    .command('start')
    .description('run the Service Node')
    .option('-n, --network <s>', 'use a custom network instead of experimental')
    .option('-d, --directory <s>', 'where to store chlu data, defaults to ~/.chlu')
    .option('--no-rendezvous', 'disable usage of rendezvous servers (not recommended right now)')
    .option('--listen', 'listen for incoming connections (not recommended right now)')
    // TODO: reenable these when they are supported again
//  .option('-e, --external-ipfs', 'connect to a running IPFS node at localhost:5001 instead of running IPFS internally')
//  .option('-c, --circuit', 'enable libp2p circuit relay to use relays to connect to peers')
//  .option('-r, --relay', 'act as libp2p relay to help nodes connect to each other (implicitly turns on --circuit)')
    .action(handleErrors(async cmd => {
        await start(cmd);
    }));

cli.parse(process.argv);

if (!process.argv.slice(2).length) {
    cli.help();
}