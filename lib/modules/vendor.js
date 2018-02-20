'use strict';

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var multihashes = require('multihashes');

var _require = require('bitcoinjs-lib'),
    ECPair = _require.ECPair,
    ECSignature = _require.ECSignature;

var _require2 = require('../utils/ipfs'),
    multihashToBuffer = _require2.multihashToBuffer;

var Vendor = function () {
    function Vendor(chluIpfs) {
        (0, _classCallCheck3.default)(this, Vendor);

        this.chluIpfs = chluIpfs;
    }

    (0, _createClass3.default)(Vendor, [{
        key: 'storePublicKey',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(pubKey) {
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                _context.next = 2;
                                return this.chluIpfs.ipfsUtils.put(pubKey);

                            case 2:
                                return _context.abrupt('return', _context.sent);

                            case 3:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function storePublicKey(_x) {
                return _ref.apply(this, arguments);
            }

            return storePublicKey;
        }()
    }, {
        key: 'getPublicKey',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(multihash) {
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                _context2.next = 2;
                                return this.chluIpfs.ipfsUtils.get(multihash);

                            case 2:
                                return _context2.abrupt('return', _context2.sent);

                            case 3:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function getPublicKey(_x2) {
                return _ref2.apply(this, arguments);
            }

            return getPublicKey;
        }()
    }, {
        key: 'signMultihash',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(multihash, keyPair) {
                var signature;
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                _context3.next = 2;
                                return keyPair.sign(this.getDigestFromMultihash(multihash));

                            case 2:
                                signature = _context3.sent;
                                return _context3.abrupt('return', signature.toDER().toString('hex'));

                            case 4:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function signMultihash(_x3, _x4) {
                return _ref3.apply(this, arguments);
            }

            return signMultihash;
        }()
    }, {
        key: 'verifyMultihash',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(pubKeyMultihash, multihash, signature) {
                var buffer, keyPair;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                _context4.next = 2;
                                return this.getPublicKey(pubKeyMultihash);

                            case 2:
                                buffer = _context4.sent;
                                _context4.next = 5;
                                return ECPair.fromPublicKeyBuffer(buffer);

                            case 5:
                                keyPair = _context4.sent;
                                return _context4.abrupt('return', keyPair.verify(this.getDigestFromMultihash(multihash), ECSignature.fromDER(Buffer.from(signature, 'hex'))));

                            case 7:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function verifyMultihash(_x5, _x6, _x7) {
                return _ref4.apply(this, arguments);
            }

            return verifyMultihash;
        }()
    }, {
        key: 'signPoPR',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(obj, keyPair) {
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                obj.signature = '';

                                if (obj.hash) {
                                    _context5.next = 5;
                                    break;
                                }

                                _context5.next = 4;
                                return this.chluIpfs.reviewRecords.hashPoPR(obj);

                            case 4:
                                obj = _context5.sent;

                            case 5:
                                _context5.next = 7;
                                return this.signMultihash(obj.hash, keyPair);

                            case 7:
                                obj.signature = _context5.sent;
                                return _context5.abrupt('return', obj);

                            case 9:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function signPoPR(_x8, _x9) {
                return _ref5.apply(this, arguments);
            }

            return signPoPR;
        }()
    }, {
        key: 'verifyPoPR',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(popr, pubKeyMultihash) {
                var obj, signature;
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                obj = (0, _assign2.default)({}, popr);
                                signature = obj.signature.slice(0); // make a copy

                                obj.signature = '';
                                _context6.next = 5;
                                return this.chluIpfs.reviewRecords.hashPoPR(obj);

                            case 5:
                                obj = _context6.sent;
                                _context6.next = 8;
                                return this.verifyMultihash(pubKeyMultihash, obj.hash, signature);

                            case 8:
                                return _context6.abrupt('return', _context6.sent);

                            case 9:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function verifyPoPR(_x10, _x11) {
                return _ref6.apply(this, arguments);
            }

            return verifyPoPR;
        }()
    }, {
        key: 'getDigestFromMultihash',
        value: function getDigestFromMultihash(multihash) {
            var decoded = multihashes.decode(multihashToBuffer(multihash));
            return decoded.digest;
        }
    }]);
    return Vendor;
}();

module.exports = Vendor;