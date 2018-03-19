'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var createIPFS = function () {
    var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(options) {
        return _regenerator2.default.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        _context.next = 2;
                        return new _promise2.default(function (resolve) {
                            var node = new IPFS(options);

                            node.on('ready', function () {
                                return resolve(node);
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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var IPFS = require('ipfs');
var multihashes = require('multihashes');
var path = require('path');
var storage = require('./storage');
var env = require('./env');

function isValidMultihash(multihash) {
    if (Buffer.isBuffer(multihash)) {
        try {
            multihashes.toB58String(multihash);
            return true;
        } catch (error) {
            return false;
        }
    } else if (typeof multihash === 'string') {
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
    if (!isValidMultihash(multihash)) throw new Error('Multihash is invalid: ' + multihash);
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

function getDAGNodeMultihash(dagNode) {
    return multihashToString(dagNode.multihash);
}

function getDefaultRepoPath() {
    var directory = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : storage.getDefaultDirectory();

    // the versioning is required due to https://github.com/ipfs/js-ipfs/issues/1115
    // in short, IPFS upgrades change the format of the repo
    // in js-ipfs, it's not currently possible to upgrade a repo
    // if we try to load an old repo from a new js-ipfs, it crashes
    if (env.isNode()) {
        return path.join(directory, 'ipfs-repo-v6');
    } else {
        return directory + 'chlu-ipfs-repo-v6';
    }
}

function getDefaultOrbitDBPath() {
    var directory = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : storage.getDefaultDirectory();

    if (env.isNode()) {
        return path.join(directory, 'orbit-db');
    } else {
        return directory + 'chlu-orbit-db';
    }
}

module.exports = {
    createIPFS: createIPFS,
    isValidMultihash: isValidMultihash,
    validateMultihash: validateMultihash,
    multihashToString: multihashToString,
    multihashToBuffer: multihashToBuffer,
    getDAGNodeMultihash: getDAGNodeMultihash,
    getDefaultRepoPath: getDefaultRepoPath,
    getDefaultOrbitDBPath: getDefaultOrbitDBPath
};