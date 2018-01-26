'use strict';

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _values = require('babel-runtime/core-js/object/values');

var _values2 = _interopRequireDefault(_values);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ipfsUtils = require('./utils/ipfs');
var protons = require('protons');
var storageUtils = require('./utils/storage');
var OrbitDB = require('orbit-db');
var Room = require('ipfs-pubsub-room');
var EventEmitter = require('events');
var constants = require('./constants');
var defaultLogger = require('./utils/logger');

var defaultIPFSOptions = {
    EXPERIMENTAL: {
        pubsub: true
    },
    config: {
        Addresses: {
            Swarm: [
            // Enable WebSocketStar transport
            '/dns4/replicator.chlu.io/tcp/13579/ws/p2p-websocket-star/', '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star', '/dns4/ws-star-signal-1.servep2p.com/tcp/443/wss/p2p-websocket-star', '/dns4/ws-star-signal-2.servep2p.com/tcp/443/wss/p2p-websocket-star']
        }
    }
};

var ChluIPFS = function () {
    function ChluIPFS() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        (0, _classCallCheck3.default)(this, ChluIPFS);

        this.utils = ipfsUtils;
        this.storage = storageUtils;
        if (typeof options.enablePersistence === 'undefined') {
            this.enablePersistence = true;
        } else {
            this.enablePersistence = options.enablePersistence;
        }
        this.directory = options.directory || this.storage.getDefaultDirectory();
        var additionalOptions = {
            repo: this.utils.getDefaultRepoPath(this.directory)
        };
        this.orbitDbDirectory = options.orbitDbDirectory || this.utils.getDefaultOrbitDBPath(this.directory);
        this.ipfsOptions = (0, _assign2.default)({}, defaultIPFSOptions, additionalOptions, options.ipfs || {});
        this.type = options.type;
        if ((0, _values2.default)(constants.types).indexOf(this.type) < 0) {
            throw new Error('Invalid type');
        }
        this.events = new EventEmitter();
        this.logger = options.logger || defaultLogger;
        this.dbs = {};
    }

    (0, _createClass3.default)(ChluIPFS, [{
        key: 'start',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
                var _this = this;

                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                this.logger.debug('Starting ChluIPFS, directory: ' + this.directory);

                                if (this.ipfs) {
                                    _context.next = 7;
                                    break;
                                }

                                this.logger.debug('Initializing IPFS');
                                _context.next = 5;
                                return this.utils.createIPFS(this.ipfsOptions);

                            case 5:
                                this.ipfs = _context.sent;

                                this.logger.debug('Initialized IPFS');

                            case 7:
                                if (!this.orbitDb) {
                                    this.logger.debug('Initializing OrbitDB with directory ' + this.orbitDbDirectory);
                                    this.orbitDb = new OrbitDB(this.ipfs, this.orbitDbDirectory);
                                    this.logger.debug('Initialized OrbitDB with directory ' + this.orbitDbDirectory);
                                }

                                // PubSub setup

                                if (this.room) {
                                    _context.next = 14;
                                    break;
                                }

                                this.room = Room(this.ipfs, constants.pubsubRoom);
                                // Handle events
                                this.listenToRoomEvents(this.room);
                                this.room.on('message', function (message) {
                                    return _this.handleMessage(message);
                                });
                                // wait for room subscription
                                _context.next = 14;
                                return new _promise2.default(function (resolve) {
                                    _this.room.once('subscribed', function () {
                                        return resolve();
                                    });
                                });

                            case 14:
                                _context.next = 16;
                                return this.loadPersistedData();

                            case 16:
                                if (!(this.type === constants.types.customer && !this.db)) {
                                    _context.next = 20;
                                    break;
                                }

                                _context.next = 19;
                                return this.openDb(constants.customerDbName);

                            case 19:
                                this.db = _context.sent;

                            case 20:
                                _context.next = 22;
                                return this.persistData();

                            case 22:
                                if (!(this.type === constants.types.customer)) {
                                    _context.next = 27;
                                    break;
                                }

                                if (!(this.room.getPeers().length === 0)) {
                                    _context.next = 26;
                                    break;
                                }

                                _context.next = 26;
                                return new _promise2.default(function (resolve) {
                                    _this.room.on('peer joined', function () {
                                        return resolve();
                                    });
                                });

                            case 26:
                                // Broadcast my review updates DB
                                this.broadcastReviewUpdates();

                            case 27:
                                return _context.abrupt('return', true);

                            case 28:
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
                                _context2.next = 2;
                                return this.persistData();

                            case 2:
                                this.room.leave();
                                _context2.next = 5;
                                return this.orbitDb.stop();

                            case 5:
                                _context2.next = 7;
                                return this.ipfs.stop();

                            case 7:
                                this.db = undefined;
                                this.dbs = {};
                                this.orbitDb = undefined;
                                this.room = undefined;
                                this.ipfs = undefined;

                            case 12:
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
            var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(newType) {
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                if (!(this.type !== newType)) {
                                    _context3.next = 17;
                                    break;
                                }

                                _context3.next = 3;
                                return this.persistData();

                            case 3:
                                if (!(this.type === constants.types.customer)) {
                                    _context3.next = 8;
                                    break;
                                }

                                if (!this.db) {
                                    _context3.next = 7;
                                    break;
                                }

                                _context3.next = 7;
                                return this.db.close();

                            case 7:
                                this.db = undefined;

                            case 8:
                                if (!(this.type === constants.types.service)) {
                                    _context3.next = 14;
                                    break;
                                }

                                if (this.room) {
                                    this.room.removeListener('message', this.serviceNodeRoomMessageListener);
                                    this.serviceNodeRoomMessageListener = undefined;
                                }

                                if (!this.dbs) {
                                    _context3.next = 13;
                                    break;
                                }

                                _context3.next = 13;
                                return _promise2.default.all((0, _values2.default)(this.dbs).map(function (db) {
                                    return db.close();
                                }));

                            case 13:
                                this.dbs = {};

                            case 14:
                                this.type = newType;
                                _context3.next = 17;
                                return this.loadPersistedData();

                            case 17:
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
        key: 'broadcastReviewUpdates',
        value: function broadcastReviewUpdates() {
            this.room.broadcast(this.utils.encodeMessage({
                type: constants.eventTypes.customerReviews,
                address: this.getOrbitDBAddress()
            }));
        }
    }, {
        key: 'pin',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(multihash) {
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                _context4.next = 2;
                                return this.room.broadcast(this.utils.encodeMessage({ type: constants.eventTypes.pinning, multihash: multihash }));

                            case 2:
                                if (!this.ipfs.pin) {
                                    _context4.next = 7;
                                    break;
                                }

                                _context4.next = 5;
                                return this.ipfs.pin.add(multihash, { recursive: true });

                            case 5:
                                _context4.next = 10;
                                break;

                            case 7:
                                // TODO: Chlu service node need to be able to pin, so we should support using go-ipfs
                                this.logger.warn('This node is running an IPFS client that does not implement pinning. Falling back to just retrieving the data non recursively. This will not be supported');
                                _context4.next = 10;
                                return this.ipfs.object.get(multihash);

                            case 10:
                                _context4.next = 12;
                                return this.room.broadcast(this.utils.encodeMessage({ type: constants.eventTypes.pinned, multihash: multihash }));

                            case 12:
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
        key: 'getOrbitDBAddress',
        value: function getOrbitDBAddress() {
            if (this.type === constants.types.customer) {
                return this.db.address.toString();
            } else {
                throw new Error('Not a customer');
            }
        }
    }, {
        key: 'getLastReviewRecordUpdate',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(db, multihash) {
                var dbValue, updatedMultihash, path;
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                this.logger.debug('Checking for review updates for ' + multihash);
                                dbValue = multihash, updatedMultihash = multihash, path = [multihash];

                            case 2:
                                if (!dbValue) {
                                    _context5.next = 16;
                                    break;
                                }

                                _context5.next = 5;
                                return db.get(dbValue);

                            case 5:
                                dbValue = _context5.sent;

                                if (!(typeof dbValue === 'string')) {
                                    _context5.next = 14;
                                    break;
                                }

                                if (!(path.indexOf(dbValue) < 0)) {
                                    _context5.next = 13;
                                    break;
                                }

                                updatedMultihash = dbValue;
                                path.push(dbValue);
                                this.logger.debug('Found forward pointer from ' + multihash + ' to ' + updatedMultihash);
                                _context5.next = 14;
                                break;

                            case 13:
                                throw new Error('Recursive references detected in this OrbitDB: ' + db.address.toString());

                            case 14:
                                _context5.next = 2;
                                break;

                            case 16:
                                if (!(multihash != updatedMultihash)) {
                                    _context5.next = 21;
                                    break;
                                }

                                this.logger.debug(multihash + ' updates to ' + updatedMultihash);
                                return _context5.abrupt('return', updatedMultihash);

                            case 21:
                                this.logger.debug('no updates found for ' + multihash);

                            case 22:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function getLastReviewRecordUpdate(_x4, _x5) {
                return _ref5.apply(this, arguments);
            }

            return getLastReviewRecordUpdate;
        }()
    }, {
        key: 'notifyIfReviewIsUpdated',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(db, multihash, notifyUpdate) {
                var updatedMultihash;
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                _context6.next = 2;
                                return this.getLastReviewRecordUpdate(db, multihash);

                            case 2:
                                updatedMultihash = _context6.sent;

                                if (updatedMultihash) {
                                    // TODO: Check that the update is valid first
                                    notifyUpdate(multihash, updatedMultihash);
                                }

                            case 4:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function notifyIfReviewIsUpdated(_x6, _x7, _x8) {
                return _ref6.apply(this, arguments);
            }

            return notifyIfReviewIsUpdated;
        }()
    }, {
        key: 'findLastReviewRecordUpdate',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(multihash, notifyUpdate) {
                var _this2 = this;

                var reviewRecord, db;
                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                _context7.next = 2;
                                return this.getReviewRecord(multihash);

                            case 2:
                                reviewRecord = _context7.sent;

                                if (!reviewRecord.orbitDb) {
                                    _context7.next = 9;
                                    break;
                                }

                                _context7.next = 6;
                                return this.openDbForReplication(reviewRecord.orbitDb);

                            case 6:
                                db = _context7.sent;

                                db.events.once('replicated', function () {
                                    return _this2.notifyIfReviewIsUpdated(db, multihash, notifyUpdate);
                                });
                                this.notifyIfReviewIsUpdated(db, multihash, notifyUpdate);

                            case 9:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function findLastReviewRecordUpdate(_x9, _x10) {
                return _ref7.apply(this, arguments);
            }

            return findLastReviewRecordUpdate;
        }()
    }, {
        key: 'getReviewRecord',
        value: function () {
            var _ref8 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee8(multihash) {
                var dagNode, buffer, messages, reviewRecord;
                return _regenerator2.default.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                _context8.next = 2;
                                return this.ipfs.object.get(this.utils.multihashToBuffer(multihash));

                            case 2:
                                dagNode = _context8.sent;
                                buffer = dagNode.data;
                                messages = protons(require('../src/utils/protobuf'));
                                reviewRecord = messages.ReviewRecord.decode(buffer);
                                return _context8.abrupt('return', reviewRecord);

                            case 7:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function getReviewRecord(_x11) {
                return _ref8.apply(this, arguments);
            }

            return getReviewRecord;
        }()
    }, {
        key: 'readReviewRecord',
        value: function () {
            var _ref9 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee9(multihash) {
                var notifyUpdate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
                var reviewRecord;
                return _regenerator2.default.wrap(function _callee9$(_context9) {
                    while (1) {
                        switch (_context9.prev = _context9.next) {
                            case 0:
                                _context9.next = 2;
                                return this.getReviewRecord(multihash);

                            case 2:
                                reviewRecord = _context9.sent;

                                // TODO validate
                                if (notifyUpdate) this.findLastReviewRecordUpdate(multihash, notifyUpdate);
                                return _context9.abrupt('return', reviewRecord);

                            case 5:
                            case 'end':
                                return _context9.stop();
                        }
                    }
                }, _callee9, this);
            }));

            function readReviewRecord(_x13) {
                return _ref9.apply(this, arguments);
            }

            return readReviewRecord;
        }()
    }, {
        key: 'storeReviewRecord',
        value: function () {
            var _ref10 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee10(reviewRecord) {
                var _this3 = this;

                var previousVersionMultihash = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
                var messages, buffer, dagNode, multihash, tasksToAwait;
                return _regenerator2.default.wrap(function _callee10$(_context10) {
                    while (1) {
                        switch (_context10.prev = _context10.next) {
                            case 0:
                                if (!(this.type !== constants.types.customer)) {
                                    _context10.next = 2;
                                    break;
                                }

                                throw new Error('Not a customer');

                            case 2:
                                reviewRecord.orbitDb = this.getOrbitDBAddress();
                                messages = protons(require('./utils/protobuf'));
                                buffer = messages.ReviewRecord.encode(reviewRecord);
                                // TODO validate
                                // write thing to ipfs

                                _context10.next = 7;
                                return this.ipfs.object.put(buffer);

                            case 7:
                                dagNode = _context10.sent;
                                multihash = this.utils.multihashToString(dagNode.multihash);
                                // Broadcast request for pin, then wait for response
                                // TODO: handle a timeout and also rebroadcast periodically, otherwise new peers won't see the message

                                tasksToAwait = [];

                                tasksToAwait.push(new _promise2.default(function (fullfill) {
                                    _this3.events.once(constants.eventTypes.pinned + '_' + multihash, function () {
                                        return fullfill();
                                    });
                                    _this3.room.broadcast(_this3.utils.encodeMessage({ type: constants.eventTypes.wroteReviewRecord, multihash: multihash }));
                                }));
                                if (previousVersionMultihash) {
                                    // This is a review update
                                    tasksToAwait.push(this.setForwardPointerForReviewRecord(previousVersionMultihash, multihash));
                                }
                                _context10.next = 14;
                                return _promise2.default.all(tasksToAwait);

                            case 14:
                                return _context10.abrupt('return', multihash);

                            case 15:
                            case 'end':
                                return _context10.stop();
                        }
                    }
                }, _callee10, this);
            }));

            function storeReviewRecord(_x15) {
                return _ref10.apply(this, arguments);
            }

            return storeReviewRecord;
        }()
    }, {
        key: 'setForwardPointerForReviewRecord',
        value: function () {
            var _ref11 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee12(previousVersionMultihash, multihash) {
                var _this4 = this;

                return _regenerator2.default.wrap(function _callee12$(_context12) {
                    while (1) {
                        switch (_context12.prev = _context12.next) {
                            case 0:
                                this.logger.debug('Setting forward pointer for ' + previousVersionMultihash + ' to ' + multihash);
                                // TODO: verify that the update is valid
                                _context12.next = 3;
                                return new _promise2.default(function () {
                                    var _ref12 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee11(fullfill) {
                                        var address;
                                        return _regenerator2.default.wrap(function _callee11$(_context11) {
                                            while (1) {
                                                switch (_context11.prev = _context11.next) {
                                                    case 0:
                                                        address = _this4.getOrbitDBAddress();

                                                        _this4.events.once(constants.eventTypes.replicated + '_' + address, function () {
                                                            return fullfill();
                                                        });
                                                        _context11.next = 4;
                                                        return _this4.db.set(previousVersionMultihash, multihash);

                                                    case 4:
                                                        _this4.broadcastReviewUpdates();
                                                        _this4.logger.debug('Waiting for remote replication');

                                                    case 6:
                                                    case 'end':
                                                        return _context11.stop();
                                                }
                                            }
                                        }, _callee11, _this4);
                                    }));

                                    return function (_x18) {
                                        return _ref12.apply(this, arguments);
                                    };
                                }());

                            case 3:
                                this.logger.debug('Done setting forward pointer, the db has been replicated remotely');
                                return _context12.abrupt('return', multihash);

                            case 5:
                            case 'end':
                                return _context12.stop();
                        }
                    }
                }, _callee12, this);
            }));

            function setForwardPointerForReviewRecord(_x16, _x17) {
                return _ref11.apply(this, arguments);
            }

            return setForwardPointerForReviewRecord;
        }()
    }, {
        key: 'exportData',
        value: function () {
            var _ref13 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee13() {
                var exported;
                return _regenerator2.default.wrap(function _callee13$(_context13) {
                    while (1) {
                        switch (_context13.prev = _context13.next) {
                            case 0:
                                exported = {};

                                if (!(this.type === constants.types.customer)) {
                                    _context13.next = 9;
                                    break;
                                }

                                _context13.next = 4;
                                return this.db.keystore.exportPublicKey();

                            case 4:
                                _context13.t0 = _context13.sent;
                                _context13.next = 7;
                                return this.db.keystore.exportPrivateKey();

                            case 7:
                                _context13.t1 = _context13.sent;
                                exported.customerDbKeys = {
                                    pub: _context13.t0,
                                    priv: _context13.t1
                                };

                            case 9:
                                return _context13.abrupt('return', exported);

                            case 10:
                            case 'end':
                                return _context13.stop();
                        }
                    }
                }, _callee13, this);
            }));

            function exportData() {
                return _ref13.apply(this, arguments);
            }

            return exportData;
        }()
    }, {
        key: 'importData',
        value: function () {
            var _ref14 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee14() {
                return _regenerator2.default.wrap(function _callee14$(_context14) {
                    while (1) {
                        switch (_context14.prev = _context14.next) {
                            case 0:
                                throw new Error('not implemented');

                            case 1:
                            case 'end':
                                return _context14.stop();
                        }
                    }
                }, _callee14, this);
            }));

            function importData() {
                return _ref14.apply(this, arguments);
            }

            return importData;
        }()
    }, {
        key: 'getVendorKeys',
        value: function () {
            var _ref15 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee15() {
                return _regenerator2.default.wrap(function _callee15$(_context15) {
                    while (1) {
                        switch (_context15.prev = _context15.next) {
                            case 0:
                                throw new Error('not implemented');

                            case 1:
                            case 'end':
                                return _context15.stop();
                        }
                    }
                }, _callee15, this);
            }));

            function getVendorKeys() {
                return _ref15.apply(this, arguments);
            }

            return getVendorKeys;
        }()
    }, {
        key: 'publishKeys',
        value: function () {
            var _ref16 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee16() {
                return _regenerator2.default.wrap(function _callee16$(_context16) {
                    while (1) {
                        switch (_context16.prev = _context16.next) {
                            case 0:
                                throw new Error('not implemented');

                            case 1:
                            case 'end':
                                return _context16.stop();
                        }
                    }
                }, _callee16, this);
            }));

            function publishKeys() {
                return _ref16.apply(this, arguments);
            }

            return publishKeys;
        }()
    }, {
        key: 'handleMessage',
        value: function () {
            var _ref17 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee17(message) {
                var obj, isOrbitDb;
                return _regenerator2.default.wrap(function _callee17$(_context17) {
                    while (1) {
                        switch (_context17.prev = _context17.next) {
                            case 0:
                                _context17.prev = 0;
                                obj = JSON.parse(message.data.toString());

                                // Handle internal events

                                this.events.emit(obj.type || constants.eventTypes.unknown, obj);
                                if (obj.type === constants.eventTypes.pinned) {
                                    // Emit internal PINNED event
                                    this.events.emit(constants.eventTypes.pinned + '_' + obj.multihash);
                                }
                                if (obj.type === constants.eventTypes.replicated) {
                                    // Emit internal REPLICATED event
                                    this.events.emit(constants.eventTypes.replicated + '_' + obj.address);
                                }

                                if (!(this.type === constants.types.service)) {
                                    _context17.next = 21;
                                    break;
                                }

                                // Service node stuff
                                isOrbitDb = obj.type === constants.eventTypes.customerReviews || obj.type === constants.eventTypes.updatedReview;
                                // handle ReviewRecord: pin hash

                                if (!(obj.type === constants.eventTypes.wroteReviewRecord && typeof obj.multihash === 'string')) {
                                    _context17.next = 20;
                                    break;
                                }

                                this.logger.info('Pinning ReviewRecord ' + obj.multihash);
                                _context17.prev = 9;
                                _context17.next = 12;
                                return this.pin(obj.multihash);

                            case 12:
                                this.logger.info('Pinned ReviewRecord ' + obj.multihash);
                                _context17.next = 18;
                                break;

                            case 15:
                                _context17.prev = 15;
                                _context17.t0 = _context17['catch'](9);

                                this.logger.error('Pin Error: ' + _context17.t0.message);

                            case 18:
                                _context17.next = 21;
                                break;

                            case 20:
                                if (isOrbitDb && typeof obj.address === 'string') {
                                    // handle OrbitDB: replicate
                                    try {
                                        this.replicate(obj.address);
                                    } catch (exception) {
                                        this.logger.error('OrbitDB Replication Error: ' + exception.message);
                                    }
                                }

                            case 21:
                                _context17.next = 26;
                                break;

                            case 23:
                                _context17.prev = 23;
                                _context17.t1 = _context17['catch'](0);

                                this.logger.warn('Error while decoding PubSub message');

                            case 26:
                            case 'end':
                                return _context17.stop();
                        }
                    }
                }, _callee17, this, [[0, 23], [9, 15]]);
            }));

            function handleMessage(_x19) {
                return _ref17.apply(this, arguments);
            }

            return handleMessage;
        }()
    }, {
        key: 'openDb',
        value: function () {
            var _ref18 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee18(address) {
                var db;
                return _regenerator2.default.wrap(function _callee18$(_context18) {
                    while (1) {
                        switch (_context18.prev = _context18.next) {
                            case 0:
                                this.logger.debug('Opening ' + address);
                                _context18.next = 3;
                                return this.orbitDb.kvstore(address);

                            case 3:
                                db = _context18.sent;

                                this.listenToDBEvents(db);
                                _context18.next = 7;
                                return db.load();

                            case 7:
                                this.logger.debug('Opened ' + address);
                                return _context18.abrupt('return', db);

                            case 9:
                            case 'end':
                                return _context18.stop();
                        }
                    }
                }, _callee18, this);
            }));

            function openDb(_x20) {
                return _ref18.apply(this, arguments);
            }

            return openDb;
        }()
    }, {
        key: 'openDbForReplication',
        value: function () {
            var _ref19 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee19(address) {
                return _regenerator2.default.wrap(function _callee19$(_context19) {
                    while (1) {
                        switch (_context19.prev = _context19.next) {
                            case 0:
                                if (this.dbs[address]) {
                                    _context19.next = 6;
                                    break;
                                }

                                _context19.next = 3;
                                return this.openDb(address);

                            case 3:
                                this.dbs[address] = _context19.sent;
                                _context19.next = 6;
                                return this.persistData();

                            case 6:
                                return _context19.abrupt('return', this.dbs[address]);

                            case 7:
                            case 'end':
                                return _context19.stop();
                        }
                    }
                }, _callee19, this);
            }));

            function openDbForReplication(_x21) {
                return _ref19.apply(this, arguments);
            }

            return openDbForReplication;
        }()
    }, {
        key: 'replicate',
        value: function () {
            var _ref20 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee20(address) {
                var _this5 = this;

                var db;
                return _regenerator2.default.wrap(function _callee20$(_context20) {
                    while (1) {
                        switch (_context20.prev = _context20.next) {
                            case 0:
                                this.logger.info('Replicating ' + address);
                                _context20.next = 3;
                                return this.openDbForReplication(address);

                            case 3:
                                db = _context20.sent;

                                this.room.broadcast(this.utils.encodeMessage({ type: constants.eventTypes.replicating, address: address }));
                                _context20.next = 7;
                                return new _promise2.default(function (fullfill) {
                                    _this5.logger.debug('Waiting for next replication of ' + address);
                                    db.events.once('replicated', fullfill);
                                    db.events.once('ready', fullfill);
                                });

                            case 7:
                                this.room.broadcast(this.utils.encodeMessage({ type: constants.eventTypes.replicated, address: address }));
                                this.logger.info('Replicated ' + address);

                            case 9:
                            case 'end':
                                return _context20.stop();
                        }
                    }
                }, _callee20, this);
            }));

            function replicate(_x22) {
                return _ref20.apply(this, arguments);
            }

            return replicate;
        }()
    }, {
        key: 'persistData',
        value: function () {
            var _ref21 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee21() {
                var data;
                return _regenerator2.default.wrap(function _callee21$(_context21) {
                    while (1) {
                        switch (_context21.prev = _context21.next) {
                            case 0:
                                if (!this.enablePersistence) {
                                    _context21.next = 9;
                                    break;
                                }

                                data = {};

                                if (this.type === constants.types.customer) {
                                    // Customer OrbitDB Address
                                    data.orbitDbAddress = this.getOrbitDBAddress();
                                } else if (this.type === constants.types.service) {
                                    // Service Node Synced OrbitDB addresses
                                    data.orbitDbAddresses = (0, _keys2.default)(this.dbs);
                                }
                                this.logger.debug('Saving persisted data');
                                _context21.next = 6;
                                return this.storage.save(this.directory, data, this.type);

                            case 6:
                                this.logger.debug('Saved persisted data');
                                _context21.next = 10;
                                break;

                            case 9:
                                this.logger.debug('Not persisting data, persistence disabled');

                            case 10:
                            case 'end':
                                return _context21.stop();
                        }
                    }
                }, _callee21, this);
            }));

            function persistData() {
                return _ref21.apply(this, arguments);
            }

            return persistData;
        }()
    }, {
        key: 'loadPersistedData',
        value: function () {
            var _ref22 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee22() {
                var data, addresses, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, address;

                return _regenerator2.default.wrap(function _callee22$(_context22) {
                    while (1) {
                        switch (_context22.prev = _context22.next) {
                            case 0:
                                if (!this.enablePersistence) {
                                    _context22.next = 45;
                                    break;
                                }

                                this.logger.debug('Loading persisted data');
                                _context22.next = 4;
                                return this.storage.load(this.directory, this.type);

                            case 4:
                                data = _context22.sent;

                                this.logger.debug('Loaded persisted data');

                                if (!(this.type === constants.types.service)) {
                                    _context22.next = 37;
                                    break;
                                }

                                // Open known OrbitDBs so that we can seed them
                                addresses = data.orbitDbAddresses || [];

                                this.logger.debug('Opening ' + addresses.length + ' OrbitDBs');
                                _iteratorNormalCompletion = true;
                                _didIteratorError = false;
                                _iteratorError = undefined;
                                _context22.prev = 12;
                                _iterator = (0, _getIterator3.default)(addresses);

                            case 14:
                                if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                                    _context22.next = 22;
                                    break;
                                }

                                address = _step.value;
                                _context22.next = 18;
                                return this.openDb(address);

                            case 18:
                                this.dbs[address] = _context22.sent;

                            case 19:
                                _iteratorNormalCompletion = true;
                                _context22.next = 14;
                                break;

                            case 22:
                                _context22.next = 28;
                                break;

                            case 24:
                                _context22.prev = 24;
                                _context22.t0 = _context22['catch'](12);
                                _didIteratorError = true;
                                _iteratorError = _context22.t0;

                            case 28:
                                _context22.prev = 28;
                                _context22.prev = 29;

                                if (!_iteratorNormalCompletion && _iterator.return) {
                                    _iterator.return();
                                }

                            case 31:
                                _context22.prev = 31;

                                if (!_didIteratorError) {
                                    _context22.next = 34;
                                    break;
                                }

                                throw _iteratorError;

                            case 34:
                                return _context22.finish(31);

                            case 35:
                                return _context22.finish(28);

                            case 36:
                                this.logger.debug('Opened all persisted OrbitDBs');

                            case 37:
                                if (!(this.type === constants.types.customer && data.orbitDbAddress)) {
                                    _context22.next = 43;
                                    break;
                                }

                                // Open previously created Customer Review Update DB
                                this.logger.debug('Opening existing Customer OrbitDB');
                                _context22.next = 41;
                                return this.openDb(data.orbitDbAddress);

                            case 41:
                                this.db = _context22.sent;

                                this.logger.debug('Opened existing Customer OrbitDB');

                            case 43:
                                _context22.next = 46;
                                break;

                            case 45:
                                this.logger.debug('Not loading persisted data, persistence disabled');

                            case 46:
                            case 'end':
                                return _context22.stop();
                        }
                    }
                }, _callee22, this, [[12, 24, 28, 36], [29,, 31, 35]]);
            }));

            function loadPersistedData() {
                return _ref22.apply(this, arguments);
            }

            return loadPersistedData;
        }()
    }, {
        key: 'listenToDBEvents',
        value: function listenToDBEvents(db) {
            var _this6 = this;

            db.events.on('replicated', function (address) {
                _this6.logger.debug('OrbitDB Event: Replicated ' + address);
            });
            db.events.on('replicate', function (address) {
                _this6.logger.debug('OrbitDB Event: Replicate ' + address);
            });
            db.events.on('replicate.progress', function (address, hash, entry, progress) {
                _this6.logger.debug('OrbitDB Event: Replicate Progress ' + progress + ' for address ' + address);
            });
            db.events.on('ready', function () {
                return _this6.logger.debug('OrbitDB Event: Ready');
            });
            db.events.on('write', function () {
                return _this6.logger.debug('OrbitDB Event: Write');
            });
            db.events.on('load', function () {
                return _this6.logger.debug('OrbitDB Event: Load');
            });
            db.events.on('load.progress', function (address, hash, entry, progress, total) {
                _this6.logger.debug('OrbitDB Event: Load Progress ' + progress + '/' + total + ' for address ' + address);
            });
        }
    }, {
        key: 'listenToRoomEvents',
        value: function listenToRoomEvents(room) {
            var _this7 = this;

            room.on('peer joined', function (peer) {
                _this7.logger.debug('Peer joined the pubsub room', peer);
            });
            room.on('peer left', function (peer) {
                _this7.logger.debug('Peer left the pubsub room', peer);
            });
            room.on('subscribed', function () {
                _this7.logger.debug('Connected to the pubsub room');
            });
            room.on('message', function (message) {
                _this7.logger.debug('PubSub Message from ' + message.from + ': ' + message.data.toString());
            });
        }
    }]);
    return ChluIPFS;
}();

module.exports = (0, _assign2.default)(ChluIPFS, constants);