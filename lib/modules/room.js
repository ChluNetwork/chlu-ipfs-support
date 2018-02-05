'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var constants = require('../constants');
var PubSubRoom = require('ipfs-pubsub-room');

var Room = function () {
    function Room(chluIpfs) {
        (0, _classCallCheck3.default)(this, Room);

        this.chluIpfs = chluIpfs;
        this.room = undefined;
    }

    (0, _createClass3.default)(Room, [{
        key: 'start',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
                var _this = this;

                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                if (this.room) {
                                    _context.next = 6;
                                    break;
                                }

                                this.room = PubSubRoom(this.chluIpfs.ipfs, constants.pubsubRoom);
                                // Handle events
                                this.listenToRoomEvents(this.room);
                                this.room.on('message', function (message) {
                                    return _this.handleMessage(message);
                                });
                                // wait for room subscription
                                _context.next = 6;
                                return new _promise2.default(function (resolve) {
                                    _this.room.once('subscribed', function () {
                                        return resolve();
                                    });
                                });

                            case 6:
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
                var _this2 = this;

                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (!this.room) {
                                    _context2.next = 4;
                                    break;
                                }

                                _context2.next = 3;
                                return new _promise2.default(function (fullfill) {
                                    _this2.room.on('stop', fullfill);
                                    _this2.room.leave();
                                });

                            case 3:
                                this.room = undefined;

                            case 4:
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
        key: 'waitForAnyPeer',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3() {
                var _this3 = this;

                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                if (!(this.room.getPeers().length === 0)) {
                                    _context3.next = 3;
                                    break;
                                }

                                _context3.next = 3;
                                return new _promise2.default(function (resolve) {
                                    _this3.room.on('peer joined', function () {
                                        return resolve();
                                    });
                                });

                            case 3:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function waitForAnyPeer() {
                return _ref3.apply(this, arguments);
            }

            return waitForAnyPeer;
        }()
    }, {
        key: 'broadcast',
        value: function broadcast(msg) {
            var message = msg;
            if ((typeof message === 'undefined' ? 'undefined' : (0, _typeof3.default)(message)) === 'object') message = (0, _stringify2.default)(message);
            if (typeof message === 'string') message = Buffer.from(message);
            if (Buffer.isBuffer(message)) {
                this.room.broadcast(message);
            } else {
                throw new Error('Message format invalid');
            }
        }
    }, {
        key: 'broadcastReviewUpdates',
        value: function broadcastReviewUpdates() {
            this.broadcast({
                type: constants.eventTypes.customerReviews,
                address: this.chluIpfs.orbitDb.getPersonalDBAddress()
            });
        }
    }, {
        key: 'handleMessage',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(message) {
                var str, obj, isOrbitDb;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                _context4.prev = 0;
                                str = message.data.toString();

                                this.chluIpfs.logger.debug('PubSub Message from ' + message.from + ': ' + str);
                                obj = JSON.parse(str);

                                // Handle internal events

                                this.chluIpfs.events.emit(obj.type || constants.eventTypes.unknown, obj);
                                if (obj.type === constants.eventTypes.pinned) {
                                    // Emit internal PINNED event
                                    this.chluIpfs.events.emit(constants.eventTypes.pinned + '_' + obj.multihash);
                                }
                                if (obj.type === constants.eventTypes.replicated) {
                                    // Emit internal REPLICATED event
                                    this.chluIpfs.events.emit(constants.eventTypes.replicated + '_' + obj.address);
                                }

                                if (!(this.chluIpfs.type === constants.types.service)) {
                                    _context4.next = 23;
                                    break;
                                }

                                // Service node stuff
                                isOrbitDb = obj.type === constants.eventTypes.customerReviews || obj.type === constants.eventTypes.updatedReview;
                                // handle ReviewRecord: pin hash

                                if (!(obj.type === constants.eventTypes.wroteReviewRecord && typeof obj.multihash === 'string')) {
                                    _context4.next = 22;
                                    break;
                                }

                                this.chluIpfs.logger.info('Pinning ReviewRecord ' + obj.multihash);
                                _context4.prev = 11;
                                _context4.next = 14;
                                return this.chluIpfs.pinning.pin(obj.multihash);

                            case 14:
                                this.chluIpfs.logger.info('Pinned ReviewRecord ' + obj.multihash);
                                _context4.next = 20;
                                break;

                            case 17:
                                _context4.prev = 17;
                                _context4.t0 = _context4['catch'](11);

                                this.chluIpfs.logger.error('Pin Error: ' + _context4.t0.message);

                            case 20:
                                _context4.next = 23;
                                break;

                            case 22:
                                if (isOrbitDb && typeof obj.address === 'string') {
                                    // handle OrbitDB: replicate
                                    try {
                                        this.chluIpfs.orbitDb.replicate(obj.address);
                                    } catch (exception) {
                                        this.chluIpfs.logger.error('OrbitDB Replication Error: ' + exception.message);
                                    }
                                }

                            case 23:
                                _context4.next = 28;
                                break;

                            case 25:
                                _context4.prev = 25;
                                _context4.t1 = _context4['catch'](0);

                                this.chluIpfs.logger.warn('Error while decoding PubSub message');

                            case 28:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this, [[0, 25], [11, 17]]);
            }));

            function handleMessage(_x) {
                return _ref4.apply(this, arguments);
            }

            return handleMessage;
        }()
    }, {
        key: 'listenToRoomEvents',
        value: function listenToRoomEvents(room) {
            var _this4 = this;

            room.on('peer joined', function (peer) {
                _this4.chluIpfs.logger.debug('Peer joined the pubsub room', peer);
            });
            room.on('peer left', function (peer) {
                _this4.chluIpfs.logger.debug('Peer left the pubsub room', peer);
            });
            room.on('subscribed', function () {
                _this4.chluIpfs.logger.debug('Connected to the pubsub room');
            });
            room.on('error', function (error) {
                _this4.chluIpfs.logger.error('PubSub Room Error: ' + error.message || error);
            });
        }
    }]);
    return Room;
}();

module.exports = Room;