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

function isValidMultihash(multihash) {
    if (Buffer.isBuffer(multihash)){
        try {
            multihashes.toB58String(multihash);
            return true;
        } catch (error) {
            return false;
        }
    } else if (typeof multihash === 'string'){
        try {
            multihashes.fromB58String(multihash);
            return true;
        } catch (error) {
            return false;
        }
    } else {
        return false;
    }
}

function validateMultihash(multihash) {
    if (!isValidMultihash(multihash)) throw new Error('The given multihash is not valid');
}

function multihashToString(multihash) {
    validateMultihash(multihash);
    if (typeof multihash === 'string') return multihash;
    return multihashes.toB58String(multihash);
}

function multihashToBuffer(multihash) {
    validateMultihash(multihash);
    if (Buffer.isBuffer(multihash)) return multihash;
    return multihashes.fromB58String(multihash);
}

function encodeMessage(msg){
    return Buffer.from(JSON.stringify(msg));
}

function decodeMessage(msg){
    let str;
    if (msg.data) {
        str = msg.data.toString();
    } else {
        str = msg;
    }
    try {
        return JSON.parse(str);
    } catch(exception) {
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
    isValidMultihash,
    validateMultihash,
    multihashToString,
    multihashToBuffer,
    encodeMessage,
    decodeMessage,
    getDefaultRepoPath,
    getDefaultOrbitDBPath
};