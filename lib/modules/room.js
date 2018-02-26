'use strict';

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

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
                                return new _promise2.default(function (resolve) {
                                    _this2.room.on('stop', resolve);
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
            if (typeof message === 'string') {
                this.chluIpfs.logger.debug('Broadcasting message: ' + message);
                message = Buffer.from(message);
            }
            if (Buffer.isBuffer(message)) {
                this.room.broadcast(message);
            } else {
                throw new Error('Message format invalid');
            }
        }
    }, {
        key: 'broadcastUntil',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(msg, expected) {
                var _this4 = this;

                var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

                var _options$retry, retry, _options$retryAfter, retryAfter, _options$maxTries, maxTries, _options$timeout, timeout, timeoutRef, globalTimeoutRef, tried, done, self, broadcaster, cleanup, retrier;

                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                _options$retry = options.retry, retry = _options$retry === undefined ? true : _options$retry, _options$retryAfter = options.retryAfter, retryAfter = _options$retryAfter === undefined ? 500 : _options$retryAfter, _options$maxTries = options.maxTries, maxTries = _options$maxTries === undefined ? 5 : _options$maxTries, _options$timeout = options.timeout, timeout = _options$timeout === undefined ? 7000 : _options$timeout;
                                timeoutRef = null;
                                globalTimeoutRef = null;
                                tried = 0;
                                done = false;
                                self = this;
                                // function that sends the message

                                broadcaster = function broadcaster() {
                                    if (!done && self.room) return self.broadcast(msg);
                                };
                                // function that clears dangling timeouts


                                cleanup = function cleanup() {
                                    done = true;
                                    if (self.room) self.room.removeListener('peer joined', broadcaster);
                                    clearTimeout(timeoutRef);
                                    clearTimeout(globalTimeoutRef);
                                };
                                // function that schedules the next resend


                                retrier = function retrier(reject) {
                                    if (tried === 0 || retry && maxTries > tried) {
                                        tried++;
                                        var nextTryIn = retryAfter * tried;
                                        if (!done) {
                                            broadcaster();
                                            timeoutRef = setTimeout(function () {
                                                if (!done) retrier(reject);
                                            }, nextTryIn);
                                        }
                                    } else {
                                        // Use this instead of throwing to avoid
                                        // uncatchable errors inside scheduled
                                        // calls using setTimeout
                                        cleanup();
                                        reject('Broadcast timed out: too many retries (' + tried + ')');
                                    }
                                };

                                _context5.next = 11;
                                return new _promise2.default(function () {
                                    var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(resolve, reject) {
                                        return _regenerator2.default.wrap(function _callee4$(_context4) {
                                            while (1) {
                                                switch (_context4.prev = _context4.next) {
                                                    case 0:
                                                        // set up absolute timeout
                                                        if (timeout > 0) {
                                                            globalTimeoutRef = setTimeout(function () {
                                                                if (!done) {
                                                                    cleanup();
                                                                    reject('Broadcast timed out after ' + timeout + 'ms');
                                                                }
                                                            }, timeout);
                                                        }
                                                        // set up resolution case
                                                        _this4.chluIpfs.events.once(expected, function () {
                                                            cleanup();
                                                            resolve();
                                                        });
                                                        // set up automatic resend on peer join
                                                        _this4.room.on('peer joined', broadcaster);
                                                        // wait for a peer to appear if there are none
                                                        _context4.next = 5;
                                                        return _this4.waitForAnyPeer();

                                                    case 5:
                                                        // broadcast and schedule next resend
                                                        timeoutRef = retrier(reject);

                                                    case 6:
                                                    case 'end':
                                                        return _context4.stop();
                                                }
                                            }
                                        }, _callee4, _this4);
                                    }));

                                    return function (_x4, _x5) {
                                        return _ref5.apply(this, arguments);
                                    };
                                }());

                            case 11:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function broadcastUntil(_x2, _x3) {
                return _ref4.apply(this, arguments);
            }

            return broadcastUntil;
        }()
    }, {
        key: 'broadcastReviewUpdates',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6() {
                var expectReplication = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
                var msg;
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                msg = {
                                    type: constants.eventTypes.customerReviews,
                                    address: this.chluIpfs.orbitDb.getPersonalDBAddress()
                                };

                                if (!expectReplication) {
                                    _context6.next = 7;
                                    break;
                                }

                                _context6.next = 4;
                                return this.broadcastUntil(msg, constants.eventTypes.replicated + '_' + this.chluIpfs.getOrbitDBAddress());

                            case 4:
                                return _context6.abrupt('return', _context6.sent);

                            case 7:
                                _context6.next = 9;
                                return this.waitForAnyPeer();

                            case 9:
                                return _context6.abrupt('return', this.broadcast(msg));

                            case 10:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function broadcastReviewUpdates() {
                return _ref6.apply(this, arguments);
            }

            return broadcastReviewUpdates;
        }()
    }, {
        key: 'handleMessage',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(message) {
                var myId, str, obj, error;
                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                _context7.prev = 0;
                                _context7.next = 3;
                                return this.chluIpfs.ipfs.id();

                            case 3:
                                myId = _context7.sent.id;

                                if (message.from !== myId) {
                                    str = message.data.toString();

                                    this.chluIpfs.logger.debug('Handling PubSub message from ' + message.from + ': ' + str);
                                    obj = parseMessage(message);


                                    this.chluIpfs.events.emit('message', obj);

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
                                }
                                _context7.next = 12;
                                break;

                            case 7:
                                _context7.prev = 7;
                                _context7.t0 = _context7['catch'](0);
                                error = 'Error while decoding PubSub message: ' + message.data.toString();

                                this.chluIpfs.logger.warn(error);
                                this.chluIpfs.events.emit('error', error);

                            case 12:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this, [[0, 7]]);
            }));

            function handleMessage(_x7) {
                return _ref7.apply(this, arguments);
            }

            return handleMessage;
        }()
    }, {
        key: 'listenToRoomEvents',
        value: function listenToRoomEvents(room) {
            var _this5 = this;

            room.on('peer joined', function (peer) {
                _this5.chluIpfs.logger.debug('Peer joined the pubsub room', peer);
                _this5.chluIpfs.events.emit('peer joined', peer);
            });
            room.on('peer left', function (peer) {
                _this5.chluIpfs.logger.debug('Peer left the pubsub room', peer);
                _this5.chluIpfs.events.emit('peer left', peer);
            });
            room.on('subscribed', function () {
                _this5.chluIpfs.logger.debug('Connected to the pubsub room');
                _this5.chluIpfs.events.emit('pubsub subscribed');
            });
            room.on('error', function (error) {
                _this5.chluIpfs.logger.error('PubSub Room Error: ' + error.message || error);
                _this5.chluIpfs.events.emit('pubsub error', error);
            });
        }
    }]);
    return Room;
}();

function parseMessage(message) {
    var str = message.data.toString();
    var obj = JSON.parse(str);
    return obj;
}

module.exports = (0, _assign2.default)(Room, { parseMessage: parseMessage });