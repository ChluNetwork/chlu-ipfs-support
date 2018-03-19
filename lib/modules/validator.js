'use strict';

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _require = require('lodash'),
    cloneDeep = _require.cloneDeep,
    isEqual = _require.isEqual;

var IPFSUtils = require('../utils/ipfs');
var axios = require('axios');

var Validator = function () {
    function Validator(chluIpfs) {
        (0, _classCallCheck3.default)(this, Validator);

        this.chluIpfs = chluIpfs;
        this.defaultValidationSettings = {
            throwErrors: true,
            validateVersion: true,
            validateMultihash: true,
            validateHistory: true,
            validateSignatures: true,
            expectedRRPublicKey: null,
            expectedPoPRPublicKey: null // TODO: pass this from readReviewRecord
        };
    }

    (0, _createClass3.default)(Validator, [{
        key: 'validateReviewRecord',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(reviewRecord) {
                var validations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
                var rr, v;
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                this.chluIpfs.logger.debug('Validating review record');
                                rr = cloneDeep(reviewRecord);
                                v = (0, _assign2.default)({}, this.defaultValidationSettings, validations);
                                _context.prev = 3;

                                if (v.validateVersion) this.validateVersion(rr);

                                if (!v.validateMultihash) {
                                    _context.next = 8;
                                    break;
                                }

                                _context.next = 8;
                                return this.validateMultihash(rr, rr.hash.slice(0));

                            case 8:
                                if (!v.validateSignatures) {
                                    _context.next = 11;
                                    break;
                                }

                                _context.next = 11;
                                return _promise2.default.all([this.validateRRSignature(rr, v.expectedRRPublicKey), this.validatePoPRSignaturesAndKeys(rr.popr, v.expectedPoPRPublicKey)]);

                            case 11:
                                if (!v.validateHistory) {
                                    _context.next = 14;
                                    break;
                                }

                                _context.next = 14;
                                return this.validateHistory(rr, v);

                            case 14:
                                this.chluIpfs.logger.debug('Validated review record (was valid)');
                                _context.next = 25;
                                break;

                            case 17:
                                _context.prev = 17;
                                _context.t0 = _context['catch'](3);

                                this.chluIpfs.logger.debug('Validated review record (was NOT valid)');

                                if (!v.throwErrors) {
                                    _context.next = 24;
                                    break;
                                }

                                throw _context.t0;

                            case 24:
                                return _context.abrupt('return', _context.t0);

                            case 25:
                                return _context.abrupt('return', null);

                            case 26:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this, [[3, 17]]);
            }));

            function validateReviewRecord(_x2) {
                return _ref.apply(this, arguments);
            }

            return validateReviewRecord;
        }()
    }, {
        key: 'validateMultihash',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(obj, expected) {
                var hashedObj;
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                this.chluIpfs.logger.debug('Validating multihash');
                                _context2.next = 3;
                                return this.chluIpfs.reviewRecords.hashReviewRecord(obj);

                            case 3:
                                hashedObj = _context2.sent;

                                if (!(expected !== hashedObj.hash)) {
                                    _context2.next = 6;
                                    break;
                                }

                                throw new Error('Mismatching hash: got ' + hashedObj.hash + ' instead of ' + expected);

                            case 6:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function validateMultihash(_x3, _x4) {
                return _ref2.apply(this, arguments);
            }

            return validateMultihash;
        }()
    }, {
        key: 'validateRRSignature',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(rr) {
                var expectedRRPublicKey = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
                var pubKeyMultihash, isExpectedKey, valid;
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                this.chluIpfs.logger.debug('Validating RR signature');
                                pubKeyMultihash = this.keyLocationToKeyMultihash(rr.key_location);
                                isExpectedKey = expectedRRPublicKey === null || expectedRRPublicKey === pubKeyMultihash;

                                if (isExpectedKey) {
                                    _context3.next = 5;
                                    break;
                                }

                                throw new Error('Expected Review Record to be signed by ' + expectedRRPublicKey + ' but found ' + pubKeyMultihash);

                            case 5:
                                _context3.next = 7;
                                return this.chluIpfs.crypto.verifyMultihash(pubKeyMultihash, rr.hash, rr.signature);

                            case 7:
                                valid = _context3.sent;

                                if (valid) {
                                    _context3.next = 10;
                                    break;
                                }

                                throw new Error('The ReviewRecord signature is invalid');

                            case 10:
                                return _context3.abrupt('return', valid);

                            case 11:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function validateRRSignature(_x6) {
                return _ref3.apply(this, arguments);
            }

            return validateRRSignature;
        }()
    }, {
        key: 'validateHistory',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(reviewRecord) {
                var _this = this;

                var validations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

                var v, history, reviewRecords, _validations;

                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                this.chluIpfs.logger.debug('Validating History');
                                v = (0, _assign2.default)({}, this.defaultValidationSettings, validations, {
                                    validateHistory: false
                                });
                                _context5.next = 4;
                                return this.chluIpfs.reviewRecords.getHistory(reviewRecord);

                            case 4:
                                history = _context5.sent;

                                if (!(history.length > 0)) {
                                    _context5.next = 10;
                                    break;
                                }

                                reviewRecords = [{ reviewRecord: reviewRecord }].concat(history);
                                _validations = reviewRecords.map(function () {
                                    var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(item, i) {
                                        return _regenerator2.default.wrap(function _callee4$(_context4) {
                                            while (1) {
                                                switch (_context4.prev = _context4.next) {
                                                    case 0:
                                                        _context4.next = 2;
                                                        return _this.validateReviewRecord(item.reviewRecord, v);

                                                    case 2:
                                                        if (i !== reviewRecords.length - 1) {
                                                            _this.validatePrevious(item.reviewRecord, reviewRecords[i + 1].reviewRecord);
                                                        }

                                                    case 3:
                                                    case 'end':
                                                        return _context4.stop();
                                                }
                                            }
                                        }, _callee4, _this);
                                    }));

                                    return function (_x9, _x10) {
                                        return _ref5.apply(this, arguments);
                                    };
                                }());
                                _context5.next = 10;
                                return _promise2.default.all(_validations);

                            case 10:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function validateHistory(_x8) {
                return _ref4.apply(this, arguments);
            }

            return validateHistory;
        }()
    }, {
        key: 'validatePoPRSignaturesAndKeys',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(popr) {
                var expectedPoPRPublicKey = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
                var hash, vmMultihash, isExpectedKey, mSignature, vSignature, vMultihash, vmSignature, marketplaceUrl, mMultihash, c, validations, valid;
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                this.chluIpfs.logger.debug('Validating PoPR Signatures and keys');

                                if (popr.hash) {
                                    _context6.next = 5;
                                    break;
                                }

                                _context6.next = 4;
                                return this.chluIpfs.reviewRecords.hashPoPR(popr);

                            case 4:
                                popr = _context6.sent;

                            case 5:
                                hash = popr.hash;
                                vmMultihash = this.keyLocationToKeyMultihash(popr.key_location);
                                isExpectedKey = expectedPoPRPublicKey === null || expectedPoPRPublicKey === vmMultihash;

                                if (isExpectedKey) {
                                    _context6.next = 10;
                                    break;
                                }

                                throw new Error('Expected PoPR to be signed by ' + expectedPoPRPublicKey + ' but found ' + vmMultihash);

                            case 10:
                                mSignature = popr.marketplace_signature;
                                vSignature = popr.vendor_signature;
                                vMultihash = this.keyLocationToKeyMultihash(popr.vendor_key_location);
                                vmSignature = popr.signature;
                                marketplaceUrl = popr.marketplace_url;
                                _context6.next = 17;
                                return this.fetchMarketplaceKey(marketplaceUrl);

                            case 17:
                                mMultihash = _context6.sent;
                                c = this.chluIpfs.crypto;
                                _context6.next = 21;
                                return _promise2.default.all([c.verifyMultihash(vMultihash, vmMultihash, vSignature), c.verifyMultihash(mMultihash, vmMultihash, mSignature), c.verifyMultihash(vmMultihash, hash, vmSignature)]);

                            case 21:
                                validations = _context6.sent;

                                // false if any validation is false
                                valid = validations.reduce(function (acc, v) {
                                    return acc && v;
                                });

                                if (!valid) {
                                    _context6.next = 29;
                                    break;
                                }

                                // Emit events about keys discovered
                                this.chluIpfs.events.emit('vendor pubkey', vMultihash);
                                this.chluIpfs.events.emit('vendor-marketplace pubkey', vmMultihash);
                                this.chluIpfs.events.emit('marketplace pubkey', mMultihash);
                                _context6.next = 30;
                                break;

                            case 29:
                                throw new Error('The PoPR is not correctly signed');

                            case 30:
                                return _context6.abrupt('return', valid);

                            case 31:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function validatePoPRSignaturesAndKeys(_x12) {
                return _ref6.apply(this, arguments);
            }

            return validatePoPRSignaturesAndKeys;
        }()
    }, {
        key: 'keyLocationToKeyMultihash',
        value: function keyLocationToKeyMultihash(l) {
            if (l.indexOf('/ipfs/') === 0) return l.substring('/ipfs/'.length);
            return l;
        }
    }, {
        key: 'fetchMarketplaceKey',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(marketplaceUrl) {
                var response, multihash;
                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                _context7.prev = 0;

                                this.chluIpfs.logger.debug('Fetching marketplace key for ' + marketplaceUrl);
                                _context7.next = 4;
                                return axios.get(marketplaceUrl + '/.well-known');

                            case 4:
                                response = _context7.sent;

                                if (!(response.status !== 200)) {
                                    _context7.next = 7;
                                    break;
                                }

                                throw new Error('Expected HTTP Status Code 200, got ' + response.status + ' instead');

                            case 7:
                                multihash = response.data.multihash;

                                IPFSUtils.validateMultihash(multihash);
                                this.chluIpfs.logger.debug('Fetched marketplace key for ' + marketplaceUrl + ': located at ' + multihash);
                                return _context7.abrupt('return', multihash);

                            case 13:
                                _context7.prev = 13;
                                _context7.t0 = _context7['catch'](0);
                                throw new Error('Error while fetching the Marketplace key at ' + marketplaceUrl + ': ' + _context7.t0.message || _context7.t0);

                            case 16:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this, [[0, 13]]);
            }));

            function fetchMarketplaceKey(_x13) {
                return _ref7.apply(this, arguments);
            }

            return fetchMarketplaceKey;
        }()
    }, {
        key: 'validatePrevious',
        value: function validatePrevious(reviewRecord, previousVersion) {
            // Check that the PoPR was not changed
            var poprEqual = isEqual(reviewRecord.popr, previousVersion.popr);
            if (!poprEqual) {
                throw new Error('PoPR was changed');
            }
            // Check other fields
            assertFieldsEqual(previousVersion, reviewRecord, ['amount', 'currency_symbol', 'customer_address', 'vendor_address', 'key_location']);
        }
    }, {
        key: 'validateVersion',
        value: function validateVersion(reviewRecord) {
            if (reviewRecord.chlu_version !== 0) {
                throw new Error('Chlu Protocol Version unsupported');
            }
        }
    }]);
    return Validator;
}();

function assertFieldsEqual(a, b, fields) {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = (0, _getIterator3.default)(fields), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var field = _step.value;

            if (!isEqual(a[field], b[field])) throw new Error(field + ' has changed from ' + a[field] + ' to ' + b[field]);
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
            }
        } finally {
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }
}

module.exports = Validator;