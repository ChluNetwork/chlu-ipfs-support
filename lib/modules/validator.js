'use strict';

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var cloneDeep = require('lodash.clonedeep');
var isEqual = require('lodash.isequal');

var Validator = function () {
    function Validator(chluIpfs) {
        (0, _classCallCheck3.default)(this, Validator);

        this.chluIpfs = chluIpfs;
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
                                rr = cloneDeep(reviewRecord);
                                v = (0, _assign2.default)({
                                    throwErrors: true,
                                    validateVersion: true,
                                    validateMultihash: true,
                                    validateHistory: true,
                                    validateSignature: false, // TODO: enable this
                                    expectedPoPRPublicKey: null // TODO: pass this from readReviewRecord
                                }, validations);
                                _context.prev = 2;

                                if (v.validateVersion) this.validateVersion(rr);
                                if (v.validateSignature) this.validateSignature(rr, v.expectedPoPRPublicKey);

                                if (!v.validateMultihash) {
                                    _context.next = 8;
                                    break;
                                }

                                _context.next = 8;
                                return this.validateMultihash(rr, rr.hash.slice(0));

                            case 8:
                                if (!v.validateHistory) {
                                    _context.next = 11;
                                    break;
                                }

                                _context.next = 11;
                                return this.validateHistory(rr);

                            case 11:
                                _context.next = 20;
                                break;

                            case 13:
                                _context.prev = 13;
                                _context.t0 = _context['catch'](2);

                                if (!v.throwErrors) {
                                    _context.next = 19;
                                    break;
                                }

                                throw _context.t0;

                            case 19:
                                return _context.abrupt('return', _context.t0);

                            case 20:
                                return _context.abrupt('return', null);

                            case 21:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this, [[2, 13]]);
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
                                _context2.next = 2;
                                return this.chluIpfs.reviewRecords.hashReviewRecord(obj);

                            case 2:
                                hashedObj = _context2.sent;

                                if (!(expected !== hashedObj.hash)) {
                                    _context2.next = 5;
                                    break;
                                }

                                throw new Error('Mismatching hash');

                            case 5:
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
        key: 'validateHistory',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(reviewRecord) {
                var _this = this;

                var history, reviewRecords, validations;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                _context4.next = 2;
                                return this.chluIpfs.reviewRecords.getHistory(reviewRecord);

                            case 2:
                                history = _context4.sent;

                                if (!(history.length > 0)) {
                                    _context4.next = 8;
                                    break;
                                }

                                reviewRecords = [{ reviewRecord: reviewRecord }].concat(history);
                                validations = reviewRecords.map(function () {
                                    var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(item, i) {
                                        return _regenerator2.default.wrap(function _callee3$(_context3) {
                                            while (1) {
                                                switch (_context3.prev = _context3.next) {
                                                    case 0:
                                                        _context3.next = 2;
                                                        return _this.validateReviewRecord(item.reviewRecord, { validateHistory: false });

                                                    case 2:
                                                        if (i !== reviewRecords.length - 1) {
                                                            _this.validatePrevious(item.reviewRecord, reviewRecords[i + 1].reviewRecord);
                                                        }

                                                    case 3:
                                                    case 'end':
                                                        return _context3.stop();
                                                }
                                            }
                                        }, _callee3, _this);
                                    }));

                                    return function (_x6, _x7) {
                                        return _ref4.apply(this, arguments);
                                    };
                                }());
                                _context4.next = 8;
                                return _promise2.default.all(validations);

                            case 8:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function validateHistory(_x5) {
                return _ref3.apply(this, arguments);
            }

            return validateHistory;
        }()
    }, {
        key: 'validateSignature',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(reviewRecord) {
                var expectedPoPRPublicKey = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                return _context5.abrupt('return', true);

                            case 1:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function validateSignature(_x9) {
                return _ref5.apply(this, arguments);
            }

            return validateSignature;
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
            assertFieldsEqual(reviewRecord, previousVersion, ['amount', 'currency_symbol', 'customer_address', 'vendor_address']);
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

            if (!isEqual(a[field], b[field])) throw new Error(field + ' has changed');
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