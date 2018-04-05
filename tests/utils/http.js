const sinon = require('sinon');

module.exports = function (fn) {
    return {
        get: sinon.stub().callsFake(async url => ({ status: 200, data: fn(url) }))
    };
};