'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

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
                        return new _promise2.default(function (fullfill) {
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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var IPFS = require('ipfs');
var multihashes = require('multihashes');
var path = require('path');
var storage = require('./storage');

function multihashToString(multihash) {
    if (typeof multihash === 'string') return multihash;
    return multihashes.toB58String(multihash);
}

function multihashToBuffer(multihash) {
    if (Buffer.isBuffer(multihash)) return multihash;
    return multihashes.fromB58String(multihash);
}

function encodeMessage(msg) {
    return Buffer.from((0, _stringify2.default)(msg));
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
    multihashToBuffer: multihashToBuffer,
    encodeMessage: encodeMessage,
    decodeMessage: decodeMessage,
    getDefaultRepoPath: getDefaultRepoPath,
    getDefaultOrbitDBPath: getDefaultOrbitDBPath
};