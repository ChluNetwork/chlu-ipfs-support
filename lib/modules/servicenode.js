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
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
                var self;
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                self = this;

                                this.handler = function (message) {
                                    return self.handleMessage(message);
                                };
                                this.chluIpfs.events.on('message', this.handler);

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
            var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2() {
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (this.handler) {
                                    this.chluIpfs.events.removeListener('message', this.handler);
                                    this.handler = undefined;
                                }

                                if (!this.chluIpfs.dbs) {
                                    _context2.next = 4;
                                    break;
                                }

                                _context2.next = 4;
                                return _promise2.default.all((0, _values2.default)(this.chluIpfs.dbs).map(function (db) {
                                    return db.close();
                                }));

                            case 4:
                                this.chluIpfs.dbs = {};

                            case 5:
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
        key: 'handleMessage',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(message) {
                var obj, isOrbitDb;
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                obj = message;
                                isOrbitDb = obj.type === constants.eventTypes.customerReviews || obj.type === constants.eventTypes.updatedReview;
                                // handle ReviewRecord: pin hash

                                if (!(obj.type === constants.eventTypes.wroteReviewRecord && typeof obj.multihash === 'string')) {
                                    _context3.next = 19;
                                    break;
                                }

                                this.chluIpfs.logger.info('Reading and Pinning ReviewRecord ' + obj.multihash);
                                _context3.prev = 4;

                                // Read review record first. This caches the content, the history, and throws if it's not valid
                                this.chluIpfs.logger.debug('Reading and validating ReviewRecord ' + obj.multihash);
                                _context3.next = 8;
                                return this.chluIpfs.readReviewRecord(obj.multihash);

                            case 8:
                                this.chluIpfs.logger.debug('Pinning validated ReviewRecord ' + obj.multihash);
                                _context3.next = 11;
                                return this.chluIpfs.pinning.pin(obj.multihash);

                            case 11:
                                this.chluIpfs.logger.info('Validated and Pinned ReviewRecord ' + obj.multihash);
                                _context3.next = 17;
                                break;

                            case 14:
                                _context3.prev = 14;
                                _context3.t0 = _context3['catch'](4);

                                this.chluIpfs.logger.error('Pinning failed due to Error: ' + _context3.t0.message);

                            case 17:
                                _context3.next = 20;
                                break;

                            case 19:
                                if (isOrbitDb && typeof obj.address === 'string') {
                                    // handle OrbitDB: replicate
                                    try {
                                        this.chluIpfs.orbitDb.replicate(obj.address);
                                    } catch (exception) {
                                        this.chluIpfs.logger.error('OrbitDB Replication Error: ' + exception.message);
                                    }
                                }

                            case 20:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this, [[4, 14]]);
            }));

            function handleMessage(_x) {
                return _ref3.apply(this, arguments);
            }

            return handleMessage;
        }()
    }]);
    return ServiceNode;
}();

module.exports = ServiceNode;