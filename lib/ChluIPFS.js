'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ipfsUtils = require('./utils/ipfs');
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
            '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star']
        }
    }
};

var ChluIPFS = function () {
    function ChluIPFS() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        _classCallCheck(this, ChluIPFS);

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
        this.ipfsOptions = Object.assign({}, defaultIPFSOptions, additionalOptions, options.ipfs || {});
        this.type = options.type;
        if (Object.values(constants.types).indexOf(this.type) < 0) {
            throw new Error('Invalid type');
        }
        this.events = new EventEmitter();
        this.logger = options.logger || defaultLogger;
        this.dbs = {};
    }

    _createClass(ChluIPFS, [{
        key: 'start',
        value: function () {
            var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
                var _this = this;

                return regeneratorRuntime.wrap(function _callee$(_context) {
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
                                return new Promise(function (resolve) {
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
                                    _context.next = 26;
                                    break;
                                }

                                if (!(this.room.getPeers().length === 0)) {
                                    _context.next = 26;
                                    break;
                                }

                                _context.next = 26;
                                return new Promise(function (resolve) {
                                    _this.room.on('peer joined', function () {
                                        return resolve();
                                    });
                                });

                            case 26:
                                return _context.abrupt('return', true);

                            case 27:
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
            var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(newType) {
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
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
                                return Promise.all(Object.values(this.dbs).map(function (db) {
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
            var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(multihash) {
                return regeneratorRuntime.wrap(function _callee4$(_context4) {
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
        key: 'storeReviewRecord',
        value: function () {
            var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(reviewRecord) {
                var _this2 = this;

                var dagNode, multihash;
                return regeneratorRuntime.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                _context5.next = 2;
                                return this.ipfs.object.put(reviewRecord);

                            case 2:
                                dagNode = _context5.sent;
                                multihash = this.utils.multihashToString(dagNode.multihash);
                                // Broadcast request for pin, then wait for response
                                // TODO: handle a timeout and also rebroadcast periodically, otherwise new peers won't see the message

                                _context5.next = 6;
                                return new Promise(function (fullfill) {
                                    _this2.events.once(constants.eventTypes.pinned + '_' + multihash, function () {
                                        return fullfill();
                                    });
                                    _this2.room.broadcast(_this2.utils.encodeMessage({ type: constants.eventTypes.wroteReviewRecord, multihash: multihash }));
                                });

                            case 6:
                                return _context5.abrupt('return', multihash);

                            case 7:
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
                var exported;
                return regeneratorRuntime.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                exported = {};

                                if (!(this.type === constants.types.customer)) {
                                    _context6.next = 9;
                                    break;
                                }

                                _context6.next = 4;
                                return this.db.keystore.exportPublicKey();

                            case 4:
                                _context6.t0 = _context6.sent;
                                _context6.next = 7;
                                return this.db.keystore.exportPrivateKey();

                            case 7:
                                _context6.t1 = _context6.sent;
                                exported.customerDbKeys = {
                                    pub: _context6.t0,
                                    priv: _context6.t1
                                };

                            case 9:
                                return _context6.abrupt('return', exported);

                            case 10:
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
            var _ref7 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7() {
                return regeneratorRuntime.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                throw new Error('not implemented');

                            case 1:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function importData() {
                return _ref7.apply(this, arguments);
            }

            return importData;
        }()
    }, {
        key: 'getVendorKeys',
        value: function () {
            var _ref8 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8() {
                return regeneratorRuntime.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                throw new Error('not implemented');

                            case 1:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function getVendorKeys() {
                return _ref8.apply(this, arguments);
            }

            return getVendorKeys;
        }()
    }, {
        key: 'publishKeys',
        value: function () {
            var _ref9 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee9() {
                return regeneratorRuntime.wrap(function _callee9$(_context9) {
                    while (1) {
                        switch (_context9.prev = _context9.next) {
                            case 0:
                                throw new Error('not implemented');

                            case 1:
                            case 'end':
                                return _context9.stop();
                        }
                    }
                }, _callee9, this);
            }));

            function publishKeys() {
                return _ref9.apply(this, arguments);
            }

            return publishKeys;
        }()
    }, {
        key: 'publishUpdatedReview',
        value: function () {
            var _ref10 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee11(updatedReview) {
                var _this3 = this;

                return regeneratorRuntime.wrap(function _callee11$(_context11) {
                    while (1) {
                        switch (_context11.prev = _context11.next) {
                            case 0:
                                // TODO: check format, check is customer
                                this.logger.debug('Adding updated review');
                                _context11.next = 3;
                                return new Promise(function () {
                                    var _ref11 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee10(fullfill) {
                                        var address;
                                        return regeneratorRuntime.wrap(function _callee10$(_context10) {
                                            while (1) {
                                                switch (_context10.prev = _context10.next) {
                                                    case 0:
                                                        address = _this3.getOrbitDBAddress();

                                                        _this3.events.once(constants.eventTypes.replicated + '_' + address, function () {
                                                            return fullfill();
                                                        });
                                                        _context10.next = 4;
                                                        return _this3.db.add(updatedReview);

                                                    case 4:
                                                        _this3.broadcastReviewUpdates();
                                                        _this3.logger.debug('Waiting for remote replication');

                                                    case 6:
                                                    case 'end':
                                                        return _context10.stop();
                                                }
                                            }
                                        }, _callee10, _this3);
                                    }));

                                    return function (_x6) {
                                        return _ref11.apply(this, arguments);
                                    };
                                }());

                            case 3:
                                this.logger.debug('Done publishing review update');

                            case 4:
                            case 'end':
                                return _context11.stop();
                        }
                    }
                }, _callee11, this);
            }));

            function publishUpdatedReview(_x5) {
                return _ref10.apply(this, arguments);
            }

            return publishUpdatedReview;
        }()
    }, {
        key: 'handleMessage',
        value: function () {
            var _ref12 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee12(message) {
                var obj, isOrbitDb;
                return regeneratorRuntime.wrap(function _callee12$(_context12) {
                    while (1) {
                        switch (_context12.prev = _context12.next) {
                            case 0:
                                _context12.prev = 0;
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
                                    _context12.next = 21;
                                    break;
                                }

                                // Service node stuff
                                isOrbitDb = obj.type === constants.eventTypes.customerReviews || obj.type === constants.eventTypes.updatedReview;
                                // handle ReviewRecord: pin hash

                                if (!(obj.type === constants.eventTypes.wroteReviewRecord && typeof obj.multihash === 'string')) {
                                    _context12.next = 20;
                                    break;
                                }

                                this.logger.info('Pinning ReviewRecord ' + obj.multihash);
                                _context12.prev = 9;
                                _context12.next = 12;
                                return this.pin(obj.multihash);

                            case 12:
                                this.logger.info('Pinned ReviewRecord ' + obj.multihash);
                                _context12.next = 18;
                                break;

                            case 15:
                                _context12.prev = 15;
                                _context12.t0 = _context12['catch'](9);

                                this.logger.error('Pin Error: ' + _context12.t0.message);

                            case 18:
                                _context12.next = 21;
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
                                _context12.next = 26;
                                break;

                            case 23:
                                _context12.prev = 23;
                                _context12.t1 = _context12['catch'](0);

                                this.logger.warn('Error while decoding PubSub message');

                            case 26:
                            case 'end':
                                return _context12.stop();
                        }
                    }
                }, _callee12, this, [[0, 23], [9, 15]]);
            }));

            function handleMessage(_x7) {
                return _ref12.apply(this, arguments);
            }

            return handleMessage;
        }()
    }, {
        key: 'openDb',
        value: function () {
            var _ref13 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee13(address) {
                var db;
                return regeneratorRuntime.wrap(function _callee13$(_context13) {
                    while (1) {
                        switch (_context13.prev = _context13.next) {
                            case 0:
                                this.logger.debug('Opening ' + address);
                                _context13.next = 3;
                                return this.orbitDb.feed(address);

                            case 3:
                                db = _context13.sent;

                                this.listenToDBEvents(db);
                                _context13.next = 7;
                                return db.load();

                            case 7:
                                this.logger.debug('Opened ' + address);
                                return _context13.abrupt('return', db);

                            case 9:
                            case 'end':
                                return _context13.stop();
                        }
                    }
                }, _callee13, this);
            }));

            function openDb(_x8) {
                return _ref13.apply(this, arguments);
            }

            return openDb;
        }()
    }, {
        key: 'openDbForReplication',
        value: function () {
            var _ref14 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee14(address) {
                return regeneratorRuntime.wrap(function _callee14$(_context14) {
                    while (1) {
                        switch (_context14.prev = _context14.next) {
                            case 0:
                                if (this.dbs[address]) {
                                    _context14.next = 6;
                                    break;
                                }

                                _context14.next = 3;
                                return this.openDb(address);

                            case 3:
                                this.dbs[address] = _context14.sent;
                                _context14.next = 6;
                                return this.persistData();

                            case 6:
                                return _context14.abrupt('return', this.dbs[address]);

                            case 7:
                            case 'end':
                                return _context14.stop();
                        }
                    }
                }, _callee14, this);
            }));

            function openDbForReplication(_x9) {
                return _ref14.apply(this, arguments);
            }

            return openDbForReplication;
        }()
    }, {
        key: 'replicate',
        value: function () {
            var _ref15 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee15(address) {
                var _this4 = this;

                var db;
                return regeneratorRuntime.wrap(function _callee15$(_context15) {
                    while (1) {
                        switch (_context15.prev = _context15.next) {
                            case 0:
                                this.logger.info('Replicating ' + address);
                                _context15.next = 3;
                                return this.openDbForReplication(address);

                            case 3:
                                db = _context15.sent;

                                this.room.broadcast(this.utils.encodeMessage({ type: constants.eventTypes.replicating, address: address }));
                                _context15.next = 7;
                                return new Promise(function (fullfill) {
                                    _this4.logger.debug('Waiting for next replication of ' + address);
                                    db.events.once('replicated', fullfill);
                                    db.events.once('ready', fullfill);
                                });

                            case 7:
                                this.room.broadcast(this.utils.encodeMessage({ type: constants.eventTypes.replicated, address: address }));
                                this.logger.info('Replicated ' + address);

                            case 9:
                            case 'end':
                                return _context15.stop();
                        }
                    }
                }, _callee15, this);
            }));

            function replicate(_x10) {
                return _ref15.apply(this, arguments);
            }

            return replicate;
        }()
    }, {
        key: 'persistData',
        value: function () {
            var _ref16 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee16() {
                var data;
                return regeneratorRuntime.wrap(function _callee16$(_context16) {
                    while (1) {
                        switch (_context16.prev = _context16.next) {
                            case 0:
                                if (!this.enablePersistence) {
                                    _context16.next = 9;
                                    break;
                                }

                                data = {};

                                if (this.type === constants.types.customer) {
                                    // Customer OrbitDB Address
                                    data.orbitDbAddress = this.getOrbitDBAddress();
                                } else if (this.type === constants.types.service) {
                                    // Service Node Synced OrbitDB addresses
                                    data.orbitDbAddresses = Object.keys(this.dbs);
                                }
                                this.logger.debug('Saving persisted data');
                                _context16.next = 6;
                                return this.storage.save(this.directory, data, this.type);

                            case 6:
                                this.logger.debug('Saved persisted data');
                                _context16.next = 10;
                                break;

                            case 9:
                                this.logger.debug('Not persisting data, persistence disabled');

                            case 10:
                            case 'end':
                                return _context16.stop();
                        }
                    }
                }, _callee16, this);
            }));

            function persistData() {
                return _ref16.apply(this, arguments);
            }

            return persistData;
        }()
    }, {
        key: 'loadPersistedData',
        value: function () {
            var _ref17 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee17() {
                var data, addresses, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, address;

                return regeneratorRuntime.wrap(function _callee17$(_context17) {
                    while (1) {
                        switch (_context17.prev = _context17.next) {
                            case 0:
                                if (!this.enablePersistence) {
                                    _context17.next = 45;
                                    break;
                                }

                                this.logger.debug('Loading persisted data');
                                _context17.next = 4;
                                return this.storage.load(this.directory, this.type);

                            case 4:
                                data = _context17.sent;

                                this.logger.debug('Loaded persisted data');

                                if (!(this.type === constants.types.service)) {
                                    _context17.next = 37;
                                    break;
                                }

                                // Open known OrbitDBs so that we can seed them
                                addresses = data.orbitDbAddresses || [];

                                this.logger.debug('Opening ' + addresses.length + ' OrbitDBs');
                                _iteratorNormalCompletion = true;
                                _didIteratorError = false;
                                _iteratorError = undefined;
                                _context17.prev = 12;
                                _iterator = addresses[Symbol.iterator]();

                            case 14:
                                if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                                    _context17.next = 22;
                                    break;
                                }

                                address = _step.value;
                                _context17.next = 18;
                                return this.openDb(address);

                            case 18:
                                this.dbs[address] = _context17.sent;

                            case 19:
                                _iteratorNormalCompletion = true;
                                _context17.next = 14;
                                break;

                            case 22:
                                _context17.next = 28;
                                break;

                            case 24:
                                _context17.prev = 24;
                                _context17.t0 = _context17['catch'](12);
                                _didIteratorError = true;
                                _iteratorError = _context17.t0;

                            case 28:
                                _context17.prev = 28;
                                _context17.prev = 29;

                                if (!_iteratorNormalCompletion && _iterator.return) {
                                    _iterator.return();
                                }

                            case 31:
                                _context17.prev = 31;

                                if (!_didIteratorError) {
                                    _context17.next = 34;
                                    break;
                                }

                                throw _iteratorError;

                            case 34:
                                return _context17.finish(31);

                            case 35:
                                return _context17.finish(28);

                            case 36:
                                this.logger.debug('Opened all persisted OrbitDBs');

                            case 37:
                                if (!(this.type === constants.types.customer && data.orbitDbAddress)) {
                                    _context17.next = 43;
                                    break;
                                }

                                // Open previously created Customer Review Update DB
                                this.logger.debug('Opening existing Customer OrbitDB');
                                _context17.next = 41;
                                return this.openDb(data.orbitDbAddress);

                            case 41:
                                this.db = _context17.sent;

                                this.logger.debug('Opened existing Customer OrbitDB');

                            case 43:
                                _context17.next = 46;
                                break;

                            case 45:
                                this.logger.debug('Not loading persisted data, persistence disabled');

                            case 46:
                            case 'end':
                                return _context17.stop();
                        }
                    }
                }, _callee17, this, [[12, 24, 28, 36], [29,, 31, 35]]);
            }));

            function loadPersistedData() {
                return _ref17.apply(this, arguments);
            }

            return loadPersistedData;
        }()
    }, {
        key: 'listenToDBEvents',
        value: function listenToDBEvents(db) {
            var _this5 = this;

            db.events.on('replicated', function (address) {
                _this5.logger.debug('OrbitDB Event: Replicated ' + address);
            });
            db.events.on('replicate', function (address) {
                _this5.logger.debug('OrbitDB Event: Replicate ' + address);
            });
            db.events.on('replicate.progress', function (address, hash, entry, progress) {
                _this5.logger.debug('OrbitDB Event: Replicate Progress ' + progress + ' for address ' + address);
            });
            db.events.on('ready', function () {
                return _this5.logger.debug('OrbitDB Event: Ready');
            });
            db.events.on('write', function () {
                return _this5.logger.debug('OrbitDB Event: Write');
            });
            db.events.on('load', function () {
                return _this5.logger.debug('OrbitDB Event: Load');
            });
            db.events.on('load.progress', function (address, hash, entry, progress, total) {
                _this5.logger.debug('OrbitDB Event: Load Progress ' + progress + '/' + total + ' for address ' + address);
            });
        }
    }, {
        key: 'listenToRoomEvents',
        value: function listenToRoomEvents(room) {
            var _this6 = this;

            room.on('peer joined', function (peer) {
                _this6.logger.debug('Peer joined the pubsub room', peer);
            });
            room.on('peer left', function (peer) {
                _this6.logger.debug('Peer left the pubsub room', peer);
            });
            room.on('subscribed', function () {
                _this6.logger.debug('Connected to the pubsub room');
            });
            room.on('message', function (message) {
                _this6.logger.debug('PubSub Message from ' + message.from + ': ' + message.data.toString());
            });
        }
    }]);

    return ChluIPFS;
}();

module.exports = Object.assign(ChluIPFS, constants);