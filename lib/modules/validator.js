'use strict';

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

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
                                rr = cloneReviewRecord(reviewRecord);
                                v = (0, _assign2.default)({
                                    validateVersion: true,
                                    validateMultihash: true,
                                    validateHistory: true
                                }, validations);

                                if (v.validateVersion) this.validateVersion(rr);

                                if (!v.validateMultihash) {
                                    _context.next = 6;
                                    break;
                                }

                                _context.next = 6;
                                return this.validateMultihash(rr, rr.hash.slice(0));

                            case 6:
                                if (!v.validateHistory) {
                                    _context.next = 9;
                                    break;
                                }

                                _context.next = 9;
                                return this.validateHistory(rr);

                            case 9:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function validateReviewRecord(_x2) {
                return _ref.apply(this, arguments);
            }

            return validateReviewRecord;
        }()
    }, {
        key: 'validateMultihash',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(reviewRecord, expected) {
                var hashedReviewRecord;
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                _context2.next = 2;
                                return this.chluIpfs.reviewRecords.setReviewRecordHash(reviewRecord);

                            case 2:
                                hashedReviewRecord = _context2.sent;

                                if (!(expected !== hashedReviewRecord.hash)) {
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

                var history, opt, rr, validations;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                _context4.next = 2;
                                return this.chluIpfs.reviewRecords.getHistory(reviewRecord);

                            case 2:
                                history = _context4.sent;

                                if (!(history.length > 0)) {
                                    _context4.next = 9;
                                    break;
                                }

                                opt = {
                                    validate: false
                                };
                                _context4.next = 7;
                                return this.chluIpfs.reviewRecords.readReviewRecord(history[0], opt);

                            case 7:
                                rr = _context4.sent;

                                this.validatePrevious(reviewRecord, rr);

                            case 9:
                                validations = history.map(function () {
                                    var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(multihash, i) {
                                        var opt, rr, prev;
                                        return _regenerator2.default.wrap(function _callee3$(_context3) {
                                            while (1) {
                                                switch (_context3.prev = _context3.next) {
                                                    case 0:
                                                        opt = {
                                                            validate: false
                                                        };
                                                        _context3.next = 3;
                                                        return _this.chluIpfs.reviewRecords.readReviewRecord(multihash, opt);

                                                    case 3:
                                                        rr = _context3.sent;
                                                        _context3.next = 6;
                                                        return _this.validateReviewRecord(rr, { validateHistory: false });

                                                    case 6:
                                                        if (!(i !== history.length - 1)) {
                                                            _context3.next = 11;
                                                            break;
                                                        }

                                                        _context3.next = 9;
                                                        return _this.chluIpfs.reviewRecords.readReviewRecord(history[i + 1]);

                                                    case 9:
                                                        prev = _context3.sent;

                                                        _this.validatePrevious(rr, prev);

                                                    case 11:
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
                                _context4.next = 12;
                                return _promise2.default.all(validations);

                            case 12:
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
        key: 'validatePrevious',
        value: function validatePrevious(reviewRecord, previousVersion) {
            // Check that the PoPR was not changed
            var poprEqual = deepEqual(reviewRecord.popr, previousVersion.popr);
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

function deepEqual(a, b) {
    return (0, _stringify2.default)(a) === (0, _stringify2.default)(b);
}

function assertFieldsEqual(a, b, fields) {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = (0, _getIterator3.default)(fields), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var field = _step.value;

            var equal = void 0;
            if ((0, _typeof3.default)(a[field]) === 'object' || (0, _typeof3.default)(b[field]) === 'object') {
                equal = deepEqual(a, b);
            } else {
                equal = a[field] === b[field];
            }
            if (!equal) throw new Error(field + ' has changed');
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

function cloneReviewRecord(reviewRecord) {
    var rr = (0, _assign2.default)({}, reviewRecord);
    if ((0, _typeof3.default)(rr.popr) === 'object') {
        (0, _assign2.default)(rr.popr, reviewRecord.popr);
    }
    return rr;
}

module.exports = Validator;