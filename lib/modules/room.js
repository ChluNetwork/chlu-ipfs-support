'use strict';

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

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

var _require = require('lodash'),
    difference = _require.difference,
    without = _require.without;

var constants = require('../constants');

var Room = function () {
    function Room(chluIpfs) {
        (0, _classCallCheck3.default)(this, Room);

        this.chluIpfs = chluIpfs;
        this.subscription = null;
        this.topic = null;
        this.peers = [];
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
                                if (this.subscription) {
                                    _context.next = 9;
                                    break;
                                }

                                this.topic = constants.pubsubTopic;
                                this.subscription = function (msg) {
                                    return _this.handleMessage(msg);
                                };
                                _context.next = 5;
                                return this.chluIpfs.ipfs.pubsub.subscribe(this.topic, this.subscription);

                            case 5:
                                _context.next = 7;
                                return this.updatePeers();

                            case 7:
                                this.pollPeers();
                                this.chluIpfs.events.emit('pubsub subscribed', this.topic);
                                // TODO: update listenToRoomEvents to poll for info instead
                                // TODO: call watchPubSubTopic

                            case 9:
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
                                if (!(this.topic && this.subscription)) {
                                    _context2.next = 4;
                                    break;
                                }

                                _context2.next = 3;
                                return this.chluIpfs.ipfs.pubsub.unsubscribe(this.topic, this.subscription);

                            case 3:
                                this.chluIpfs.events.emit('pubsub unsubscribed', this.topic);

                            case 4:
                                this.subscription = null;
                                this.topic = null;
                                this.peers = [];

                            case 7:
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
                var _this2 = this;

                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                if (!(this.getPeers().length === 0)) {
                                    _context3.next = 3;
                                    break;
                                }

                                _context3.next = 3;
                                return new _promise2.default(function (resolve, reject) {
                                    _this2.chluIpfs.events.on('peer joined', function () {
                                        return resolve();
                                    });
                                    _this2.chluIpfs.events.on('pubsub error', function (err) {
                                        return reject(err);
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
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(msg) {
                var message;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                message = msg;

                                if ((typeof message === 'undefined' ? 'undefined' : (0, _typeof3.default)(message)) === 'object') message = (0, _stringify2.default)(message);
                                if (typeof message === 'string') {
                                    this.chluIpfs.logger.debug('Broadcasting message: ' + message);
                                    message = Buffer.from(message);
                                }

                                if (!Buffer.isBuffer(message)) {
                                    _context4.next = 8;
                                    break;
                                }

                                _context4.next = 6;
                                return this.chluIpfs.ipfs.pubsub.publish(this.topic, message);

                            case 6:
                                _context4.next = 9;
                                break;

                            case 8:
                                throw new Error('Message format invalid');

                            case 9:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function broadcast(_x) {
                return _ref4.apply(this, arguments);
            }

            return broadcast;
        }()
    }, {
        key: 'broadcastUntil',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee8(msg, expected) {
                var _this3 = this;

                var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

                var _options$retry, retry, _options$retryAfter, retryAfter, _options$maxTries, maxTries, _options$timeout, timeout, timeoutRef, globalTimeoutRef, tried, done, self, broadcaster, cleanup, retrier;

                return _regenerator2.default.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                _options$retry = options.retry, retry = _options$retry === undefined ? true : _options$retry, _options$retryAfter = options.retryAfter, retryAfter = _options$retryAfter === undefined ? 500 : _options$retryAfter, _options$maxTries = options.maxTries, maxTries = _options$maxTries === undefined ? 5 : _options$maxTries, _options$timeout = options.timeout, timeout = _options$timeout === undefined ? 7000 : _options$timeout;
                                timeoutRef = null;
                                globalTimeoutRef = null;
                                tried = 0;
                                done = false;
                                self = this;
                                // function that sends the message

                                broadcaster = function () {
                                    var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5() {
                                        return _regenerator2.default.wrap(function _callee5$(_context5) {
                                            while (1) {
                                                switch (_context5.prev = _context5.next) {
                                                    case 0:
                                                        if (!(!done && self.subscription)) {
                                                            _context5.next = 4;
                                                            break;
                                                        }

                                                        _context5.next = 3;
                                                        return self.broadcast(msg);

                                                    case 3:
                                                        return _context5.abrupt('return', _context5.sent);

                                                    case 4:
                                                    case 'end':
                                                        return _context5.stop();
                                                }
                                            }
                                        }, _callee5, _this3);
                                    }));

                                    return function broadcaster() {
                                        return _ref6.apply(this, arguments);
                                    };
                                }();
                                // function that clears dangling timeouts


                                cleanup = function cleanup() {
                                    done = true;
                                    self.chluIpfs.events.removeListener('peer joined', broadcaster);
                                    clearTimeout(timeoutRef);
                                    clearTimeout(globalTimeoutRef);
                                };
                                // function that schedules the next resend


                                retrier = function () {
                                    var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(reject) {
                                        var nextTryIn;
                                        return _regenerator2.default.wrap(function _callee6$(_context6) {
                                            while (1) {
                                                switch (_context6.prev = _context6.next) {
                                                    case 0:
                                                        if (!(tried === 0 || retry && maxTries > tried)) {
                                                            _context6.next = 15;
                                                            break;
                                                        }

                                                        tried++;
                                                        nextTryIn = retryAfter * tried;

                                                        if (done) {
                                                            _context6.next = 13;
                                                            break;
                                                        }

                                                        _context6.prev = 4;
                                                        _context6.next = 7;
                                                        return broadcaster();

                                                    case 7:
                                                        timeoutRef = setTimeout(function () {
                                                            if (!done) retrier(reject);
                                                        }, nextTryIn);
                                                        _context6.next = 13;
                                                        break;

                                                    case 10:
                                                        _context6.prev = 10;
                                                        _context6.t0 = _context6['catch'](4);

                                                        reject(_context6.t0);

                                                    case 13:
                                                        _context6.next = 17;
                                                        break;

                                                    case 15:
                                                        // Use this instead of throwing to avoid
                                                        // uncatchable errors inside scheduled
                                                        // calls using setTimeout
                                                        cleanup();
                                                        reject(new Error('Broadcast timed out: too many retries (' + tried + ')'));

                                                    case 17:
                                                    case 'end':
                                                        return _context6.stop();
                                                }
                                            }
                                        }, _callee6, _this3, [[4, 10]]);
                                    }));

                                    return function retrier(_x5) {
                                        return _ref7.apply(this, arguments);
                                    };
                                }();

                                _context8.next = 11;
                                return new _promise2.default(function () {
                                    var _ref8 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(resolve, reject) {
                                        return _regenerator2.default.wrap(function _callee7$(_context7) {
                                            while (1) {
                                                switch (_context7.prev = _context7.next) {
                                                    case 0:
                                                        // set up absolute timeout
                                                        if (timeout > 0) {
                                                            globalTimeoutRef = setTimeout(function () {
                                                                if (!done) {
                                                                    cleanup();
                                                                    reject(new Error('Broadcast timed out after ' + timeout + 'ms'));
                                                                }
                                                            }, timeout);
                                                        }
                                                        // set up resolution case
                                                        _this3.chluIpfs.events.once(expected, function () {
                                                            cleanup();
                                                            resolve();
                                                        });
                                                        // set up automatic resend on peer join
                                                        _this3.chluIpfs.events.on('peer joined', broadcaster);
                                                        // wait for a peer to appear if there are none
                                                        _context7.next = 5;
                                                        return _this3.waitForAnyPeer();

                                                    case 5:
                                                        _context7.next = 7;
                                                        return retrier(reject);

                                                    case 7:
                                                    case 'end':
                                                        return _context7.stop();
                                                }
                                            }
                                        }, _callee7, _this3);
                                    }));

                                    return function (_x6, _x7) {
                                        return _ref8.apply(this, arguments);
                                    };
                                }());

                            case 11:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function broadcastUntil(_x3, _x4) {
                return _ref5.apply(this, arguments);
            }

            return broadcastUntil;
        }()
    }, {
        key: 'broadcastReviewUpdates',
        value: function () {
            var _ref9 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee9() {
                var expectReplication = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
                var msg;
                return _regenerator2.default.wrap(function _callee9$(_context9) {
                    while (1) {
                        switch (_context9.prev = _context9.next) {
                            case 0:
                                msg = {
                                    type: constants.eventTypes.customerReviews,
                                    address: this.chluIpfs.orbitDb.getPersonalDBAddress()
                                };

                                if (!expectReplication) {
                                    _context9.next = 7;
                                    break;
                                }

                                _context9.next = 4;
                                return this.broadcastUntil(msg, constants.eventTypes.replicated + '_' + this.chluIpfs.getOrbitDBAddress());

                            case 4:
                                return _context9.abrupt('return', _context9.sent);

                            case 7:
                                _context9.next = 9;
                                return this.waitForAnyPeer();

                            case 9:
                                _context9.next = 11;
                                return this.broadcast(msg);

                            case 11:
                                return _context9.abrupt('return', _context9.sent);

                            case 12:
                            case 'end':
                                return _context9.stop();
                        }
                    }
                }, _callee9, this);
            }));

            function broadcastReviewUpdates() {
                return _ref9.apply(this, arguments);
            }

            return broadcastReviewUpdates;
        }()
    }, {
        key: 'handleMessage',
        value: function () {
            var _ref10 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee10(message) {
                var myId, str, obj, error;
                return _regenerator2.default.wrap(function _callee10$(_context10) {
                    while (1) {
                        switch (_context10.prev = _context10.next) {
                            case 0:
                                _context10.prev = 0;
                                _context10.next = 3;
                                return this.chluIpfs.ipfsUtils.id();

                            case 3:
                                myId = _context10.sent;

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
                                _context10.next = 12;
                                break;

                            case 7:
                                _context10.prev = 7;
                                _context10.t0 = _context10['catch'](0);
                                error = 'Error while decoding PubSub message: ' + message.data.toString();

                                this.chluIpfs.logger.warn(error);
                                this.chluIpfs.events.emit('error', error);

                            case 12:
                            case 'end':
                                return _context10.stop();
                        }
                    }
                }, _callee10, this, [[0, 7]]);
            }));

            function handleMessage(_x9) {
                return _ref10.apply(this, arguments);
            }

            return handleMessage;
        }()
    }, {
        key: 'getPeers',
        value: function getPeers() {
            return [].concat((0, _toConsumableArray3.default)(this.peers)); // Readonly copy
        }
    }, {
        key: 'pollPeers',
        value: function pollPeers() {
            var intervalMs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1000;

            if (this.topic && this.subscription) {
                this.pollPeersTimeout = setTimeout(function (self) {
                    self.updatePeers().then(function () {
                        return self.pollPeers(intervalMs);
                    }).catch(function (err) {
                        return self.chluIpfs.events.emit('pubsub error', err);
                    });
                }, intervalMs, this);
            }
        }
    }, {
        key: 'stopPollingPeers',
        value: function stopPollingPeers() {
            clearTimeout(this.pollPeersTimeout);
        }
    }, {
        key: 'updatePeers',
        value: function () {
            var _ref11 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee11() {
                var myId, pubsubPeers, updatedPeers, currentPeers, joinedPeers, leftPeers;
                return _regenerator2.default.wrap(function _callee11$(_context11) {
                    while (1) {
                        switch (_context11.prev = _context11.next) {
                            case 0:
                                if (!(this.subscription && this.topic)) {
                                    _context11.next = 23;
                                    break;
                                }

                                _context11.prev = 1;
                                _context11.next = 4;
                                return this.chluIpfs.ipfsUtils.id();

                            case 4:
                                myId = _context11.sent;
                                _context11.next = 7;
                                return this.chluIpfs.ipfs.pubsub.peers(this.topic);

                            case 7:
                                pubsubPeers = _context11.sent;
                                updatedPeers = without(pubsubPeers, myId);
                                currentPeers = this.getPeers();
                                joinedPeers = difference(updatedPeers, currentPeers);
                                leftPeers = difference(currentPeers, updatedPeers);

                                this.peers = updatedPeers;
                                this.emitPeerEvents(joinedPeers, leftPeers);
                                _context11.next = 21;
                                break;

                            case 16:
                                _context11.prev = 16;
                                _context11.t0 = _context11['catch'](1);

                                this.chluIpfs.events.emit('pubsub error', _context11.t0);
                                this.emitPeerEvents([], this.peers || []);
                                this.peers = [];

                            case 21:
                                _context11.next = 25;
                                break;

                            case 23:
                                this.emitPeerEvents([], this.peers || []);
                                this.peers = [];

                            case 25:
                            case 'end':
                                return _context11.stop();
                        }
                    }
                }, _callee11, this, [[1, 16]]);
            }));

            function updatePeers() {
                return _ref11.apply(this, arguments);
            }

            return updatePeers;
        }()
    }, {
        key: 'emitPeerEvents',
        value: function emitPeerEvents() {
            var _this4 = this;

            var joinedPeers = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
            var leftPeers = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

            joinedPeers.forEach(function (p) {
                return _this4.chluIpfs.events.emit('peer joined', p);
            });
            leftPeers.forEach(function (p) {
                return _this4.chluIpfs.events.emit('peer left', p);
            });
        }
    }, {
        key: 'listenToPubSubEvents',
        value: function listenToPubSubEvents() {
            var _this5 = this;

            this.chluIpfs.events.on('peer joined', function (peer) {
                _this5.chluIpfs.logger.debug('Peer joined the pubsub room', peer);
            });
            this.chluIpfs.events.on('peer left', function (peer) {
                _this5.chluIpfs.logger.debug('Peer left the pubsub room', peer);
            });
            this.chluIpfs.events.on('subscribed', function () {
                _this5.chluIpfs.logger.debug('Connected to the pubsub room');
            });
            this.chluIpfs.events.on('pubsub error', function (error) {
                _this5.chluIpfs.logger.error('PubSub Error: ' + error.message || error);
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