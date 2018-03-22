'use strict';

var _values = require('babel-runtime/core-js/object/values');

var _values2 = _interopRequireDefault(_values);

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

var constants = require('../constants');

var ServiceNode = function () {
    function ServiceNode(chluIpfs) {
        (0, _classCallCheck3.default)(this, ServiceNode);

        this.chluIpfs = chluIpfs;
    }

    (0, _createClass3.default)(ServiceNode, [{
        key: 'start',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4() {
                var _this = this;

                var self;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                self = this;

                                this.handler = function (message) {
                                    return self.handleMessage(message);
                                };
                                this.pinner = function () {
                                    var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(multihash) {
                                        return _regenerator2.default.wrap(function _callee$(_context) {
                                            while (1) {
                                                switch (_context.prev = _context.next) {
                                                    case 0:
                                                        try {
                                                            _this.chluIpfs.pinning.pin(multihash);
                                                        } catch (error) {
                                                            _this.chluIpfs.logger.error('Pinning failed due to Error: ' + error.message);
                                                        }

                                                    case 1:
                                                    case 'end':
                                                        return _context.stop();
                                                }
                                            }
                                        }, _callee, _this);
                                    }));

                                    return function (_x) {
                                        return _ref2.apply(this, arguments);
                                    };
                                }();
                                this.replicatedNotifier = function () {
                                    var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(address) {
                                        return _regenerator2.default.wrap(function _callee2$(_context2) {
                                            while (1) {
                                                switch (_context2.prev = _context2.next) {
                                                    case 0:
                                                        _context2.prev = 0;
                                                        _context2.next = 3;
                                                        return _this.chluIpfs.room.broadcast({
                                                            type: constants.eventTypes.replicated,
                                                            address: address
                                                        });

                                                    case 3:
                                                        _context2.next = 8;
                                                        break;

                                                    case 5:
                                                        _context2.prev = 5;
                                                        _context2.t0 = _context2['catch'](0);

                                                        _this.chluIpfs.logger.warn('Could not send message due to Error: ' + _context2.t0.message);

                                                    case 8:
                                                    case 'end':
                                                        return _context2.stop();
                                                }
                                            }
                                        }, _callee2, _this, [[0, 5]]);
                                    }));

                                    return function (_x2) {
                                        return _ref3.apply(this, arguments);
                                    };
                                }();
                                this.replicatingNotifier = function () {
                                    var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(address) {
                                        return _regenerator2.default.wrap(function _callee3$(_context3) {
                                            while (1) {
                                                switch (_context3.prev = _context3.next) {
                                                    case 0:
                                                        _context3.prev = 0;
                                                        _context3.next = 3;
                                                        return _this.chluIpfs.room.broadcast({
                                                            type: constants.eventTypes.replicating,
                                                            address: address
                                                        });

                                                    case 3:
                                                        _context3.next = 8;
                                                        break;

                                                    case 5:
                                                        _context3.prev = 5;
                                                        _context3.t0 = _context3['catch'](0);

                                                        _this.chluIpfs.logger.warn('Could not send message due to Error: ' + _context3.t0.message);

                                                    case 8:
                                                    case 'end':
                                                        return _context3.stop();
                                                }
                                            }
                                        }, _callee3, _this, [[0, 5]]);
                                    }));

                                    return function (_x3) {
                                        return _ref4.apply(this, arguments);
                                    };
                                }();
                                // Handle Chlu network messages
                                this.chluIpfs.events.on('message', this.handler);
                                // Pin public keys
                                this.chluIpfs.events.on('vendor pubkey', this.pinner);
                                this.chluIpfs.events.on('vendor-marketplace pubkey', this.pinner);
                                this.chluIpfs.events.on('marketplace pubkey', this.pinner);
                                this.chluIpfs.events.on('customer pubkey', this.pinner);
                                // Send messages on replication
                                this.chluIpfs.events.on('replicate', this.replicatingNotifier);
                                this.chluIpfs.events.on('replicated', this.replicatedNotifier);

                            case 12:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function start() {
                return _ref.apply(this, arguments);
            }

            return start;
        }()
    }, {
        key: 'stop',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5() {
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                if (this.handler) {
                                    this.chluIpfs.events.removeListener('message', this.handler);
                                    this.handler = undefined;
                                }

                                if (!this.chluIpfs.dbs) {
                                    _context5.next = 4;
                                    break;
                                }

                                _context5.next = 4;
                                return _promise2.default.all((0, _values2.default)(this.chluIpfs.dbs).map(function (db) {
                                    return db.close();
                                }));

                            case 4:
                                this.chluIpfs.dbs = {};

                            case 5:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function stop() {
                return _ref5.apply(this, arguments);
            }

            return stop;
        }()
    }, {
        key: 'handleMessage',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(message) {
                var obj;
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                obj = message;
                                // handle ReviewRecord: pin hash

                                if (!(obj.type === constants.eventTypes.wroteReviewRecord && typeof obj.multihash === 'string')) {
                                    _context6.next = 16;
                                    break;
                                }

                                this.chluIpfs.logger.info('Reading and Pinning ReviewRecord ' + obj.multihash);
                                _context6.prev = 3;

                                // Read review record first. This caches the content, the history, and throws if it's not valid
                                this.chluIpfs.logger.debug('Reading and validating ReviewRecord ' + obj.multihash);
                                _context6.next = 7;
                                return this.chluIpfs.readReviewRecord(obj.multihash, {
                                    checkForUpdates: true
                                });

                            case 7:
                                this.chluIpfs.logger.debug('Pinning validated ReviewRecord ' + obj.multihash);
                                _context6.next = 10;
                                return this.chluIpfs.pinning.pin(obj.multihash);

                            case 10:
                                this.chluIpfs.logger.info('Validated and Pinned ReviewRecord ' + obj.multihash);
                                _context6.next = 16;
                                break;

                            case 13:
                                _context6.prev = 13;
                                _context6.t0 = _context6['catch'](3);

                                this.chluIpfs.logger.error('Pinning failed due to Error: ' + _context6.t0.message);

                            case 16:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this, [[3, 13]]);
            }));

            function handleMessage(_x4) {
                return _ref6.apply(this, arguments);
            }

            return handleMessage;
        }()
    }]);
    return ServiceNode;
}();

module.exports = ServiceNode;