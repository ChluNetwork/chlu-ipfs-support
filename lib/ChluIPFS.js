'use strict';

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

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
var Pinning = require('./modules/pinning');
var Room = require('./modules/room');
var ReviewRecords = require('./modules/reviewrecords');
var storageUtils = require('./utils/storage');
var OrbitDB = require('orbit-db');
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
        // Modules
        this.pinning = new Pinning(this);
        this.room = new Room(this);
        this.reviewRecords = new ReviewRecords(this);
    }

    (0, _createClass3.default)(ChluIPFS, [{
        key: 'start',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
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

                                _context.next = 10;
                                return this.room.start();

                            case 10:
                                _context.next = 12;
                                return this.loadPersistedData();

                            case 12:
                                if (!(this.type === constants.types.customer && !this.db)) {
                                    _context.next = 16;
                                    break;
                                }

                                _context.next = 15;
                                return this.openDb(constants.customerDbName);

                            case 15:
                                this.db = _context.sent;

                            case 16:
                                _context.next = 18;
                                return this.persistData();

                            case 18:
                                if (!(this.type === constants.types.customer)) {
                                    _context.next = 22;
                                    break;
                                }

                                _context.next = 21;
                                return this.room.waitForAnyPeer();

                            case 21:
                                // Broadcast my review updates DB
                                this.room.broadcastReviewUpdates();

                            case 22:
                                return _context.abrupt('return', true);

                            case 23:
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
                                _context2.next = 4;
                                return this.orbitDb.stop();

                            case 4:
                                _context2.next = 6;
                                return this.room.stop();

                            case 6:
                                _context2.next = 8;
                                return this.ipfs.stop();

                            case 8:
                                this.db = undefined;
                                this.dbs = {};
                                this.orbitDb = undefined;
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
                                    _context3.next = 16;
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
                                    _context3.next = 13;
                                    break;
                                }

                                if (!this.dbs) {
                                    _context3.next = 12;
                                    break;
                                }

                                _context3.next = 12;
                                return _promise2.default.all((0, _values2.default)(this.dbs).map(function (db) {
                                    return db.close();
                                }));

                            case 12:
                                this.dbs = {};

                            case 13:
                                this.type = newType;
                                _context3.next = 16;
                                return this.loadPersistedData();

                            case 16:
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
        key: 'getOrbitDBAddress',
        value: function getOrbitDBAddress() {
            if (this.type === constants.types.customer) {
                return this.db.address.toString();
            } else {
                throw new Error('Not a customer');
            }
        }
    }, {
        key: 'readReviewRecord',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(multihash) {
                var notifyUpdate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                _context4.next = 2;
                                return this.reviewRecords.readReviewRecord(multihash, notifyUpdate);

                            case 2:
                                return _context4.abrupt('return', _context4.sent);

                            case 3:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function readReviewRecord(_x4) {
                return _ref4.apply(this, arguments);
            }

            return readReviewRecord;
        }()
    }, {
        key: 'storeReviewRecord',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(reviewRecord) {
                var previousVersionMultihash = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                _context5.next = 2;
                                return this.reviewRecords.storeReviewRecord(reviewRecord, previousVersionMultihash);

                            case 2:
                                return _context5.abrupt('return', _context5.sent);

                            case 3:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function storeReviewRecord(_x6) {
                return _ref5.apply(this, arguments);
            }

            return storeReviewRecord;
        }()
    }, {
        key: 'exportData',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6() {
                var exported;
                return _regenerator2.default.wrap(function _callee6$(_context6) {
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
            var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7() {
                return _regenerator2.default.wrap(function _callee7$(_context7) {
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
            var _ref8 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee8() {
                return _regenerator2.default.wrap(function _callee8$(_context8) {
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
            var _ref9 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee9() {
                return _regenerator2.default.wrap(function _callee9$(_context9) {
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
        key: 'openDb',
        value: function () {
            var _ref10 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee10(address) {
                var db;
                return _regenerator2.default.wrap(function _callee10$(_context10) {
                    while (1) {
                        switch (_context10.prev = _context10.next) {
                            case 0:
                                this.logger.debug('Opening ' + address);
                                db = void 0;
                                _context10.prev = 2;
                                _context10.next = 5;
                                return this.orbitDb.kvstore(address);

                            case 5:
                                db = _context10.sent;

                                this.listenToDBEvents(db);
                                _context10.next = 9;
                                return db.load();

                            case 9:
                                this.logger.debug('Opened ' + address);
                                _context10.next = 15;
                                break;

                            case 12:
                                _context10.prev = 12;
                                _context10.t0 = _context10['catch'](2);

                                this.logger.error('Coud not Open ' + address + ': ' + _context10.t0.message || _context10.t0);

                            case 15:
                                return _context10.abrupt('return', db);

                            case 16:
                            case 'end':
                                return _context10.stop();
                        }
                    }
                }, _callee10, this, [[2, 12]]);
            }));

            function openDb(_x7) {
                return _ref10.apply(this, arguments);
            }

            return openDb;
        }()
    }, {
        key: 'openDbForReplication',
        value: function () {
            var _ref11 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee11(address) {
                return _regenerator2.default.wrap(function _callee11$(_context11) {
                    while (1) {
                        switch (_context11.prev = _context11.next) {
                            case 0:
                                if (this.dbs[address]) {
                                    _context11.next = 7;
                                    break;
                                }

                                _context11.next = 3;
                                return this.openDb(address);

                            case 3:
                                this.dbs[address] = _context11.sent;

                                if (!this.dbs[address]) {
                                    _context11.next = 7;
                                    break;
                                }

                                _context11.next = 7;
                                return this.persistData();

                            case 7:
                                return _context11.abrupt('return', this.dbs[address]);

                            case 8:
                            case 'end':
                                return _context11.stop();
                        }
                    }
                }, _callee11, this);
            }));

            function openDbForReplication(_x8) {
                return _ref11.apply(this, arguments);
            }

            return openDbForReplication;
        }()
    }, {
        key: 'replicate',
        value: function () {
            var _ref12 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee12(address) {
                var _this = this;

                var db;
                return _regenerator2.default.wrap(function _callee12$(_context12) {
                    while (1) {
                        switch (_context12.prev = _context12.next) {
                            case 0:
                                this.logger.info('Replicating ' + address);
                                _context12.next = 3;
                                return this.openDbForReplication(address);

                            case 3:
                                db = _context12.sent;

                                if (!db) {
                                    _context12.next = 10;
                                    break;
                                }

                                this.room.broadcast({ type: constants.eventTypes.replicating, address: address });
                                _context12.next = 8;
                                return new _promise2.default(function (fullfill) {
                                    _this.logger.debug('Waiting for next replication of ' + address);
                                    db.events.once('replicated', fullfill);
                                    db.events.once('ready', fullfill);
                                });

                            case 8:
                                this.room.broadcast({ type: constants.eventTypes.replicated, address: address });
                                this.logger.info('Replicated ' + address);

                            case 10:
                            case 'end':
                                return _context12.stop();
                        }
                    }
                }, _callee12, this);
            }));

            function replicate(_x9) {
                return _ref12.apply(this, arguments);
            }

            return replicate;
        }()
    }, {
        key: 'persistData',
        value: function () {
            var _ref13 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee13() {
                var data;
                return _regenerator2.default.wrap(function _callee13$(_context13) {
                    while (1) {
                        switch (_context13.prev = _context13.next) {
                            case 0:
                                if (!this.enablePersistence) {
                                    _context13.next = 15;
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
                                _context13.prev = 4;
                                _context13.next = 7;
                                return this.storage.save(this.directory, data, this.type);

                            case 7:
                                _context13.next = 12;
                                break;

                            case 9:
                                _context13.prev = 9;
                                _context13.t0 = _context13['catch'](4);

                                this.logger.error('Could not write data: ' + _context13.t0.message || _context13.t0);

                            case 12:
                                this.logger.debug('Saved persisted data');
                                _context13.next = 16;
                                break;

                            case 15:
                                this.logger.debug('Not persisting data, persistence disabled');

                            case 16:
                            case 'end':
                                return _context13.stop();
                        }
                    }
                }, _callee13, this, [[4, 9]]);
            }));

            function persistData() {
                return _ref13.apply(this, arguments);
            }

            return persistData;
        }()
    }, {
        key: 'loadPersistedData',
        value: function () {
            var _ref14 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee14() {
                var data, addresses, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, address;

                return _regenerator2.default.wrap(function _callee14$(_context14) {
                    while (1) {
                        switch (_context14.prev = _context14.next) {
                            case 0:
                                if (!this.enablePersistence) {
                                    _context14.next = 45;
                                    break;
                                }

                                this.logger.debug('Loading persisted data');
                                _context14.next = 4;
                                return this.storage.load(this.directory, this.type);

                            case 4:
                                data = _context14.sent;

                                this.logger.debug('Loaded persisted data');

                                if (!(this.type === constants.types.service)) {
                                    _context14.next = 37;
                                    break;
                                }

                                // Open known OrbitDBs so that we can seed them
                                addresses = data.orbitDbAddresses || [];

                                this.logger.debug('Opening ' + addresses.length + ' OrbitDBs');
                                _iteratorNormalCompletion = true;
                                _didIteratorError = false;
                                _iteratorError = undefined;
                                _context14.prev = 12;
                                _iterator = (0, _getIterator3.default)(addresses);

                            case 14:
                                if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                                    _context14.next = 22;
                                    break;
                                }

                                address = _step.value;
                                _context14.next = 18;
                                return this.openDb(address);

                            case 18:
                                this.dbs[address] = _context14.sent;

                            case 19:
                                _iteratorNormalCompletion = true;
                                _context14.next = 14;
                                break;

                            case 22:
                                _context14.next = 28;
                                break;

                            case 24:
                                _context14.prev = 24;
                                _context14.t0 = _context14['catch'](12);
                                _didIteratorError = true;
                                _iteratorError = _context14.t0;

                            case 28:
                                _context14.prev = 28;
                                _context14.prev = 29;

                                if (!_iteratorNormalCompletion && _iterator.return) {
                                    _iterator.return();
                                }

                            case 31:
                                _context14.prev = 31;

                                if (!_didIteratorError) {
                                    _context14.next = 34;
                                    break;
                                }

                                throw _iteratorError;

                            case 34:
                                return _context14.finish(31);

                            case 35:
                                return _context14.finish(28);

                            case 36:
                                this.logger.debug('Opened all persisted OrbitDBs');

                            case 37:
                                if (!(this.type === constants.types.customer && data.orbitDbAddress)) {
                                    _context14.next = 43;
                                    break;
                                }

                                // Open previously created Customer Review Update DB
                                this.logger.debug('Opening existing Customer OrbitDB');
                                _context14.next = 41;
                                return this.openDb(data.orbitDbAddress);

                            case 41:
                                this.db = _context14.sent;

                                if (this.db) this.logger.debug('Opened existing Customer OrbitDB');

                            case 43:
                                _context14.next = 46;
                                break;

                            case 45:
                                this.logger.debug('Not loading persisted data, persistence disabled');

                            case 46:
                            case 'end':
                                return _context14.stop();
                        }
                    }
                }, _callee14, this, [[12, 24, 28, 36], [29,, 31, 35]]);
            }));

            function loadPersistedData() {
                return _ref14.apply(this, arguments);
            }

            return loadPersistedData;
        }()
    }, {
        key: 'listenToDBEvents',
        value: function listenToDBEvents(db) {
            var _this2 = this;

            db.events.on('replicated', function (address) {
                _this2.logger.debug('OrbitDB Event: Replicated ' + address);
            });
            db.events.on('replicate', function (address) {
                _this2.logger.debug('OrbitDB Event: Replicate ' + address);
            });
            db.events.on('replicate.progress', function (address, hash, entry, progress) {
                _this2.logger.debug('OrbitDB Event: Replicate Progress ' + progress + ' for address ' + address);
            });
            db.events.on('ready', function () {
                return _this2.logger.debug('OrbitDB Event: Ready');
            });
            db.events.on('write', function () {
                return _this2.logger.debug('OrbitDB Event: Write');
            });
            db.events.on('load', function () {
                return _this2.logger.debug('OrbitDB Event: Load');
            });
            db.events.on('load.progress', function (address, hash, entry, progress, total) {
                _this2.logger.debug('OrbitDB Event: Load Progress ' + progress + '/' + total + ' for address ' + address);
            });
        }
    }]);
    return ChluIPFS;
}();

module.exports = (0, _assign2.default)(ChluIPFS, constants);