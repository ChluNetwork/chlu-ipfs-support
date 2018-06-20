const sinon = require('sinon');
const DAGNode = require('ipld-dag-pb').DAGNode;

module.exports = function (fakeStore) {
    const get = sinon.stub().callsFake(async m => fakeStore[m])
    const getJSON = sinon.stub().callsFake(async m => {
        const buf = fakeStore[m]
        if (buf) {
            const str = buf.toString()
            return JSON.parse(str)
        } else {
            return null
        }
    })
    const putRaw = async data => {
        const buf = Buffer.from(data);
        const multihash = await new Promise((resolve, reject) => {
            DAGNode.create(buf, [], (err, dagNode) => {
                if (err) reject(err); else resolve(dagNode.toJSON().multihash);
            });
        });
        fakeStore[multihash] = buf;
        return multihash;
    }
    const put = sinon.stub().callsFake(putRaw)
    const putJSON = sinon.stub().callsFake(async data => {
        let arg = data
        if (typeof arg !== 'string') arg = JSON.stringify(arg)
        return putRaw(arg)
    })
    return {
        id: sinon.stub().resolves('myId'),
        get,
        getJSON,
        put,
        putJSON,
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