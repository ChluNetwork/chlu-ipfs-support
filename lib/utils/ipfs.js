'use strict';

var createIPFS = function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(options) {
        return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        _context.next = 2;
                        return new Promise(function (fullfill) {
                            var node = new IPFS(options);

                            node.on('ready', function () {
                                return fullfill(node);
                            });
                        });

                    case 2:
                        return _context.abrupt('return', _context.sent);

                    case 3:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function createIPFS(_x) {
        return _ref.apply(this, arguments);
    };
}();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var IPFS = require('ipfs');
var multihashes = require('multihashes');
var path = require('path');
var storage = require('./storage');

function multihashToString(multihash) {
    if (typeof multihash === 'string') return multihash;
    return multihashes.toB58String(multihash);
}

function encodeMessage(msg) {
    return Buffer.from(JSON.stringify(msg));
}

function decodeMessage(msg) {
    var str = void 0;
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

function getDefaultRepoPath() {
    var directory = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : storage.getDefaultDirectory();

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

function getDefaultOrbitDBPath() {
    var directory = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : storage.getDefaultDirectory();

    if (typeof window === 'undefined') {
        return path.join(directory, 'orbit-db');
    } else {
        return 'chlu-orbit-db';
    }
}

module.exports = {
    createIPFS: createIPFS,
    multihashToString: multihashToString,
    encodeMessage: encodeMessage,
    decodeMessage: decodeMessage,
    getDefaultRepoPath: getDefaultRepoPath,
    getDefaultOrbitDBPath: getDefaultOrbitDBPath
};