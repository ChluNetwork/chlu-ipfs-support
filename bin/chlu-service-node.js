#!/usr/bin/env node
const ChluIPFS = require('../src/index.js');
const cli = require('commander');
const package = require('../package.json');

let serviceNode = null;

function handleErrors(fn) {
    return function (...args) {
        fn(...args).catch(err => {
            console.trace(err);
            process.exit(1);
        });
    };
}

async function start(network, externalIpfs, enableRelayHop){
    console.log('Starting Chlu IPFS Service Node');
    serviceNode = new ChluIPFS({
        type: ChluIPFS.types.service,
        network: network || ChluIPFS.networks.experimental,
        ipfs: {
            type: externalIpfs ? ChluIPFS.ipfsTypes.remote : null,
            enableRelayHop
        }
    });
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
    .option('-n, --network <s>', 'use a custom network instead of production')
    .option('-e, --external-ipfs', 'connect to a running IPFS node at localhost:5001')
    .option('-r, --relay', 'act as libp2p relay to help nodes connect to each other')
    .action(handleErrors(async cmd => {
        await start(cmd.network, cmd.externalIpfs, cmd.relay);
    }));

cli.parse(process.argv);

if (!process.argv.slice(2).length) {
    cli.help();
}