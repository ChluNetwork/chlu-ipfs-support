const IPFS = require('ipfs');
const multihashes = require('multihashes');
const path = require('path');
const storage = require('./storage');

async function createIPFS(options) {
    return await new Promise(fullfill => {
        const node = new IPFS(options);

        node.on('ready', () => fullfill(node));
    });
}

function multihashToString(multihash) {
    if (typeof multihash === 'string') return multihash;
    return multihashes.toB58String(multihash);
}

function encodeMessage(msg) {
    return Buffer.from(JSON.stringify(msg));
}

function decodeMessage(msg) {
    let str;
    if (msg.data) {
        str = msg.data.toString();
    } else {
        str = msg;
    }
    try {
        return JSON.parse(str);
    } catch (exception) {
        return null;
    }
}

function getDefaultRepoPath(directory = storage.getDefaultDirectory()) {
    // the versioning is required due to https://github.com/ipfs/js-ipfs/issues/1115
    // in short, IPFS upgrades change the format of the repo
    // in js-ipfs, it's not currently possible to upgrade a repo
    // if we try to load an old repo from a new js-ipfs, it crashes
    if (typeof window === 'undefined') {
        return path.join(directory, 'ipfs-repo-v6');
    } else {
        return 'chlu-ipfs-repo-v6';
    }
}

function getDefaultOrbitDBPath(directory = storage.getDefaultDirectory()) {
    if (typeof window === 'undefined') {
        return path.join(directory, 'orbit-db');
    } else {
        return 'chlu-orbit-db';
    }
}

module.exports = {
    createIPFS,
    multihashToString,
    encodeMessage,
    decodeMessage,
    getDefaultRepoPath,
    getDefaultOrbitDBPath
};