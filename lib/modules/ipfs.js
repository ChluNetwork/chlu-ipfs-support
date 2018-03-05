'use strict';

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DAGNode = require('ipld-dag-pb').DAGNode;
var utils = require('../utils/ipfs');

var IPFS = function () {
    function IPFS(chluIpfs) {
        (0, _classCallCheck3.default)(this, IPFS);

        this.chluIpfs = chluIpfs;
    }

    (0, _createClass3.default)(IPFS, [{
        key: 'get',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(multihash) {
                var dagNode;
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                _context.next = 2;
                                return this.chluIpfs.ipfs.object.get(utils.multihashToBuffer(multihash));

                            case 2:
                                dagNode = _context.sent;
                                return _context.abrupt('return', dagNode.data);

                            case 4:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function get(_x) {
                return _ref.apply(this, arguments);
            }

            return get;
        }()
    }, {
        key: 'createDAGNode',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(buf) {
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (Buffer.isBuffer(buf)) {
                                    _context2.next = 2;
                                    break;
                                }

                                throw new Error('Argument is not a buffer');

                            case 2:
                                _context2.next = 4;
                                return new _promise2.default(function (resolve, reject) {
                                    DAGNode.create(buf, [], function (err, dagNode) {
                                        if (err) reject(err);else resolve(dagNode);
                                    });
                                });

                            case 4:
                                return _context2.abrupt('return', _context2.sent);

                            case 5:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function createDAGNode(_x2) {
                return _ref2.apply(this, arguments);
            }

            return createDAGNode;
        }()
    }, {
        key: 'storeDAGNode',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(dagNode) {
                var newDagNode;
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                _context3.next = 2;
                                return this.chluIpfs.ipfs.object.put(dagNode);

                            case 2:
                                newDagNode = _context3.sent;

                                if (!(newDagNode.toJSON().multihash !== dagNode.toJSON().multihash)) {
                                    _context3.next = 5;
                                    break;
                                }

                                throw new Error('Multihash mismatch');

                            case 5:
                                return _context3.abrupt('return', utils.getDAGNodeMultihash(newDagNode));

                            case 6:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function storeDAGNode(_x3) {
                return _ref3.apply(this, arguments);
            }

            return storeDAGNode;
        }()
    }, {
        key: 'put',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(data) {
                var buf, dagNode;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                buf = null;

                                if (typeof data === 'string') buf = Buffer.from(data);else if (Buffer.isBuffer(data)) buf = data;

                                if (Buffer.isBuffer(buf)) {
                                    _context4.next = 4;
                                    break;
                                }

                                throw new Error('Could not convert data into buffer');

                            case 4:
                                _context4.next = 6;
                                return this.chluIpfs.ipfs.object.put(buf);

                            case 6:
                                dagNode = _context4.sent;
                                return _context4.abrupt('return', utils.getDAGNodeMultihash(dagNode));

                            case 8:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function put(_x4) {
                return _ref4.apply(this, arguments);
            }

            return put;
        }()
    }]);
    return IPFS;
}();

module.exports = (0, _assign2.default)(IPFS, utils);