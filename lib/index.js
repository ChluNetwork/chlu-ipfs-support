'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ChluIPFS = require('./ChluIPFS');
var ChluIPFSMock = require('./ChluIPFS.mock');
var constants = require('./constants');

var ChluIPFSAPI = function () {
    function ChluIPFSAPI() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        _classCallCheck(this, ChluIPFSAPI);

        if (options.mock) {
            this.instance = new ChluIPFSMock(options);
        } else {
            this.instance = new ChluIPFS(options);
        }
    }

    _createClass(ChluIPFSAPI, [{
        key: 'getOrbitDBAddress',
        value: function getOrbitDBAddress() {
            return this.instance.getOrbitDBAddress();
        }
    }, {
        key: 'start',
        value: function () {
            var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
                return regeneratorRuntime.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                _context.next = 2;
                                return this.instance.start();

                            case 2:
                                return _context.abrupt('return', _context.sent);

                            case 3:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function start() {
                return _ref.apply(this, arguments);
            }

            return start;
        }()
    }, {
        key: 'stop',
        value: function () {
            var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                _context2.next = 2;
                                return this.instance.stop();

                            case 2:
                                return _context2.abrupt('return', _context2.sent);

                            case 3:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function stop() {
                return _ref2.apply(this, arguments);
            }

            return stop;
        }()
    }, {
        key: 'switchType',
        value: function () {
            var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(newType) {
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                _context3.next = 2;
                                return this.instance.switchType(newType);

                            case 2:
                                return _context3.abrupt('return', _context3.sent);

                            case 3:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function switchType(_x2) {
                return _ref3.apply(this, arguments);
            }

            return switchType;
        }()
    }, {
        key: 'pin',
        value: function () {
            var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(multihash) {
                return regeneratorRuntime.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                _context4.next = 2;
                                return this.instance.pin(multihash);

                            case 2:
                                return _context4.abrupt('return', _context4.sent);

                            case 3:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function pin(_x3) {
                return _ref4.apply(this, arguments);
            }

            return pin;
        }()
    }, {
        key: 'storeReviewRecord',
        value: function () {
            var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(reviewRecord) {
                return regeneratorRuntime.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                _context5.next = 2;
                                return this.instance.storeReviewRecord(reviewRecord);

                            case 2:
                                return _context5.abrupt('return', _context5.sent);

                            case 3:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function storeReviewRecord(_x4) {
                return _ref5.apply(this, arguments);
            }

            return storeReviewRecord;
        }()
    }, {
        key: 'exportData',
        value: function () {
            var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6() {
                return regeneratorRuntime.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                _context6.next = 2;
                                return this.instance.exportData();

                            case 2:
                                return _context6.abrupt('return', _context6.sent);

                            case 3:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function exportData() {
                return _ref6.apply(this, arguments);
            }

            return exportData;
        }()
    }, {
        key: 'importData',
        value: function () {
            var _ref7 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(exportedData) {
                return regeneratorRuntime.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                _context7.next = 2;
                                return this.instance.importData(exportedData);

                            case 2:
                                return _context7.abrupt('return', _context7.sent);

                            case 3:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function importData(_x5) {
                return _ref7.apply(this, arguments);
            }

            return importData;
        }()
    }, {
        key: 'getVendorKeys',
        value: function () {
            var _ref8 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8(ipnsName) {
                return regeneratorRuntime.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                _context8.next = 2;
                                return this.instance.getVendorKeys(ipnsName);

                            case 2:
                                return _context8.abrupt('return', _context8.sent);

                            case 3:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function getVendorKeys(_x6) {
                return _ref8.apply(this, arguments);
            }

            return getVendorKeys;
        }()
    }, {
        key: 'publishKeys',
        value: function () {
            var _ref9 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee9(publicEncKey, publicSigKey) {
                return regeneratorRuntime.wrap(function _callee9$(_context9) {
                    while (1) {
                        switch (_context9.prev = _context9.next) {
                            case 0:
                                _context9.next = 2;
                                return this.instance.publishKeys(publicEncKey, publicSigKey);

                            case 2:
                                return _context9.abrupt('return', _context9.sent);

                            case 3:
                            case 'end':
                                return _context9.stop();
                        }
                    }
                }, _callee9, this);
            }));

            function publishKeys(_x7, _x8) {
                return _ref9.apply(this, arguments);
            }

            return publishKeys;
        }()
    }, {
        key: 'publishUpdatedReview',
        value: function () {
            var _ref10 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee10(updatedReview) {
                return regeneratorRuntime.wrap(function _callee10$(_context10) {
                    while (1) {
                        switch (_context10.prev = _context10.next) {
                            case 0:
                                _context10.next = 2;
                                return this.instance.publishUpdatedReview(updatedReview);

                            case 2:
                                return _context10.abrupt('return', _context10.sent);

                            case 3:
                            case 'end':
                                return _context10.stop();
                        }
                    }
                }, _callee10, this);
            }));

            function publishUpdatedReview(_x9) {
                return _ref10.apply(this, arguments);
            }

            return publishUpdatedReview;
        }()
    }]);

    return ChluIPFSAPI;
}();

module.exports = Object.assign(ChluIPFSAPI, constants);