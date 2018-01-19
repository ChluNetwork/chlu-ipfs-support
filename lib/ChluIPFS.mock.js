'use strict';

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _values = require('babel-runtime/core-js/object/values');

var _values2 = _interopRequireDefault(_values);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var constants = require('./constants');
var time = require('./utils/timing');

var ChluIPFS = function () {
    function ChluIPFS() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        (0, _classCallCheck3.default)(this, ChluIPFS);

        if ((0, _values2.default)(constants.types).indexOf(options.type) < 0) {
            throw new Error('Invalid type');
        }
        this.type = options.type;
        if (options.fakeWait !== undefined) {
            this.fakeWait = options.fakeWait;
        } else {
            this.fakeWait = true;
        }
    }

    (0, _createClass3.default)(ChluIPFS, [{
        key: '_wait',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(ms) {
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                if (!this.fakeWait) {
                                    _context.next = 3;
                                    break;
                                }

                                _context.next = 3;
                                return time.milliseconds(ms);

                            case 3:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function _wait(_x2) {
                return _ref.apply(this, arguments);
            }

            return _wait;
        }()
    }, {
        key: 'start',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2() {
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                _context2.next = 2;
                                return this._wait(1000);

                            case 2:
                                return _context2.abrupt('return', true);

                            case 3:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function start() {
                return _ref2.apply(this, arguments);
            }

            return start;
        }()
    }, {
        key: 'stop',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3() {
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                _context3.next = 2;
                                return this._wait(1000);

                            case 2:
                                return _context3.abrupt('return', true);

                            case 3:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function stop() {
                return _ref3.apply(this, arguments);
            }

            return stop;
        }()
    }, {
        key: 'switchType',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(type) {
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                _context4.next = 2;
                                return this._wait(1000);

                            case 2:
                                this.type = type;

                            case 3:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function switchType(_x3) {
                return _ref4.apply(this, arguments);
            }

            return switchType;
        }()
    }, {
        key: 'pin',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5() {
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                _context5.next = 2;
                                return this._wait(3000);

                            case 2:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function pin() {
                return _ref5.apply(this, arguments);
            }

            return pin;
        }()
    }, {
        key: 'getOrbitDBAddress',
        value: function getOrbitDBAddress() {
            return 'mockedorbitdbaddress';
        }
    }, {
        key: 'storeReviewRecord',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6() {
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                _context6.next = 2;
                                return this._wait(3000);

                            case 2:
                                return _context6.abrupt('return', 'mockedRRmultihash');

                            case 3:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function storeReviewRecord() {
                return _ref6.apply(this, arguments);
            }

            return storeReviewRecord;
        }()
    }, {
        key: 'exportData',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7() {
                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                _context7.next = 2;
                                return this._wait(1000);

                            case 2:
                                if (!(this.type === constants.types.customer)) {
                                    _context7.next = 4;
                                    break;
                                }

                                return _context7.abrupt('return', {
                                    customerDbKeys: {
                                        pub: 'examplePublicKey',
                                        priv: 'examplePrivateKey'
                                    }
                                });

                            case 4:
                                return _context7.abrupt('return', {});

                            case 5:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function exportData() {
                return _ref7.apply(this, arguments);
            }

            return exportData;
        }()
    }, {
        key: 'importData',
        value: function () {
            var _ref8 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee8() {
                return _regenerator2.default.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                _context8.next = 2;
                                return this._wait(1000);

                            case 2:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function importData() {
                return _ref8.apply(this, arguments);
            }

            return importData;
        }()
    }, {
        key: 'getVendorKeys',
        value: function () {
            var _ref9 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee9() {
                return _regenerator2.default.wrap(function _callee9$(_context9) {
                    while (1) {
                        switch (_context9.prev = _context9.next) {
                            case 0:
                                _context9.next = 2;
                                return this._wait(5000);

                            case 2:
                                return _context9.abrupt('return', { pubenc: 'mockedpubenckey', pubsig: 'mockedpubsigkey' });

                            case 3:
                            case 'end':
                                return _context9.stop();
                        }
                    }
                }, _callee9, this);
            }));

            function getVendorKeys() {
                return _ref9.apply(this, arguments);
            }

            return getVendorKeys;
        }()
    }, {
        key: 'publishKeys',
        value: function () {
            var _ref10 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee10() {
                return _regenerator2.default.wrap(function _callee10$(_context10) {
                    while (1) {
                        switch (_context10.prev = _context10.next) {
                            case 0:
                                _context10.next = 2;
                                return this._wait(3000);

                            case 2:
                                return _context10.abrupt('return', 'fakekeysmultihash');

                            case 3:
                            case 'end':
                                return _context10.stop();
                        }
                    }
                }, _callee10, this);
            }));

            function publishKeys() {
                return _ref10.apply(this, arguments);
            }

            return publishKeys;
        }()
    }, {
        key: 'publishUpdatedReview',
        value: function () {
            var _ref11 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee11() {
                return _regenerator2.default.wrap(function _callee11$(_context11) {
                    while (1) {
                        switch (_context11.prev = _context11.next) {
                            case 0:
                                _context11.next = 2;
                                return this._wait(5000);

                            case 2:
                            case 'end':
                                return _context11.stop();
                        }
                    }
                }, _callee11, this);
            }));

            function publishUpdatedReview() {
                return _ref11.apply(this, arguments);
            }

            return publishUpdatedReview;
        }()
    }]);
    return ChluIPFS;
}();

module.exports = (0, _assign2.default)(ChluIPFS, constants);