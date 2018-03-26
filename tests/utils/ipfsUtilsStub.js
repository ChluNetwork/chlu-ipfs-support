const sinon = require('sinon');
const DAGNode = require('ipld-dag-pb').DAGNode;

module.exports = function (fakeStore) {
    return {
        id: sinon.stub().resolves('myId'),
        get: sinon.stub().callsFake(async m => fakeStore[m]),
        put: sinon.stub().callsFake(async data => {
            const buf = Buffer.from(data);
            const multihash = await new Promise((resolve, reject) => {
                DAGNode.create(buf, [], (err, dagNode) => {
                    if (err) reject(err); else resolve(dagNode.toJSON().multihash);
                });
            });
            fakeStore[multihash] = buf;
            return multihash;
        }),
        storeDAGNode: sinon.stub().callsFake(async dagNode => {
            const data = dagNode.toJSON();
            fakeStore[data.multihash] = data.data;
            return data.multihash;
        }),
        createDAGNode: sinon.stub().callsFake(async buf => {
            return await new Promise((resolve, reject) => {
                DAGNode.create(buf, [], (err, dagNode) => {
                    if (err) reject(err); else resolve(dagNode);
                });
            });
        })
    };
};