const DAGNode = require('ipld-dag-pb').DAGNode;
const utils = require('../utils/ipfs');

class IPFS {
    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs;
    }

    async id() {
        return (await this.chluIpfs.ipfs.id()).id;
    }

    async get(multihash) {
        const dagNode = await this.chluIpfs.ipfs.object.get(utils.multihashToBuffer(multihash));
        return dagNode.data;
    }

    async createDAGNode(buf) {
        if (!Buffer.isBuffer(buf)) {
            throw new Error('Argument is not a buffer');
        }
        return await new Promise((resolve, reject) => {
            DAGNode.create(buf, [], (err, dagNode) => {
                if (err) reject(err); else resolve(dagNode);
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

    async put(data) {
        let buf = null;
        if (typeof data === 'string') buf = Buffer.from(data);
        else if (Buffer.isBuffer(data)) buf = data;
        if (!Buffer.isBuffer(buf)) throw new Error('Could not convert data into buffer');
        const dagNode = await this.chluIpfs.ipfs.object.put(buf);
        return utils.getDAGNodeMultihash(dagNode);
    }
}

module.exports = Object.assign(IPFS, utils);