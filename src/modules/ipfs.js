const DAGNode = require('ipld-dag-pb').DAGNode;
const utils = require('../utils/ipfs');

class IPFS {
    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
    }

    async get(multihash) {
        const dagNode = await this.chluIpfs.ipfs.object.get(utils.multihashToBuffer(multihash));
        return dagNode.data;
    }

    async createDAGNode(buf) {
        if (!Buffer.isBuffer(buf)) {
            throw new Error('Argument is not a buffer');
        }
        return await new Promise((fullfill, reject) => {
            DAGNode.create(buf, [], (err, dagNode) => {
                if (err) reject(err); else fullfill(dagNode);
            });
        });
    }

    async storeDAGNode(dagNode) {
        const newDagNode = await this.chluIpfs.ipfs.object.put(dagNode);
        if (newDagNode.toJSON().multihash !== dagNode.toJSON().multihash) {
            throw new Error('Multihash mismatch');
        }
        return utils.getDAGNodeMultihash(newDagNode);
    }
}

module.exports = Object.assign(IPFS, utils);