#!/usr/bin/env node
const ChluIPFS = require('../src/index.js');
const ServiceNode = require('../src/modules/servicenode')
const cli = require('commander');
const package = require('../package.json');
const { startRendezvousServer } = require('../src/utils/rendezvous');

let chluIpfs = null, rendezvous = null;

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
    if (!options.btc) {
        throw new Error('BTC Blockchain access through BlockCypher is required');
    }
    const config = {
        network: options.network || ChluIPFS.networks.experimental,
        directory: options.directory,
        ipfs: {
            remote: options.externalIpfs
        },
        listen: options.listen,
        useCircuit: options.circuit || options.relay,
        relay: options.relay,
        useRendezvous: options.rendezvous,
        bootstrap: options.bootstrap,
        blockCypherApiKey: options.btc,
        bitcoinNetwork: options.btcNetwork
    };
    if (options.offline) {
        console.log('Starting rendezvous server for OFFLINE mode');
        rendezvous = await startRendezvousServer(ChluIPFS.rendezvousPorts.local);
    }
    chluIpfs = new ChluIPFS(config);
    chluIpfs.serviceNode = new ServiceNode(chluIpfs)
    await chluIpfs.start();
    await chluIpfs.serviceNode.start()
}

process.on('SIGINT', async function() {
    try {
        console.log('Stopping gracefully');
        if (chluIpfs) {
            if (chluIpfs.serviceNode) {
                await chluIpfs.serviceNode.stop()
            }
            await chluIpfs.stop();
        }
        if (rendezvous) {
            console.log('Stopping rendezvous server');
            await rendezvous.stop();
        }
        console.log('Goodbye!');
        process.exit(0);
    } catch(exception) {
        console.trace(exception);
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
    // Chlu specific options
    .option('-n, --network <network>', 'use a custom network instead of experimental')
    .option('-d, --directory <path>', 'where to store chlu data, defaults to ~/.chlu')
    .option('--offline', 'signal other Chlu apps on your machine to ONLY connect to this service node and work offline')
    .option('--bootstrap', 'connect to Chlu bootstrap nodes (not recommended right now)')
    // Blockchain
    .option('--btc <token>', 'turn on BTC Blockchain access using a Blockcypher API Token. Other systems will be supported in the future')
    .option('--btc-network <network>', 'choose the BTC network you want to connect to. Default is test3')
    // IPFS/libp2p options
    .option('--listen', 'listen for incoming connections (not recommended right now)')
    .option('--no-rendezvous', 'disable usage of rendezvous servers (not recommended right now)')
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