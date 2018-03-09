'use strict';

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

var IPFSUtils = require('./modules/ipfs');
var Pinning = require('./modules/pinning');
var Room = require('./modules/room');
var ReviewRecords = require('./modules/reviewrecords');
var Validator = require('./modules/validator');
var DB = require('./modules/orbitdb');
var Persistence = require('./modules/persistence');
var ServiceNode = require('./modules/servicenode');
var Crypto = require('./modules/crypto');
var storageUtils = require('./utils/storage');
var EventEmitter = require('events');
var constants = require('./constants');
var defaultLogger = require('./utils/logger');

var ChluIPFS = function () {
    function ChluIPFS() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        (0, _classCallCheck3.default)(this, ChluIPFS);

        // Configuration
        this.storage = storageUtils;
        if (typeof options.enablePersistence === 'undefined') {
            this.enablePersistence = true;
        } else {
            this.enablePersistence = options.enablePersistence;
        }
        this.directory = options.directory || this.storage.getDefaultDirectory();
        var additionalOptions = {
            repo: IPFSUtils.getDefaultRepoPath(this.directory)
        };
        this.orbitDbDirectory = options.orbitDbDirectory || IPFSUtils.getDefaultOrbitDBPath(this.directory);
        this.ipfsOptions = (0, _assign2.default)({}, constants.defaultIPFSOptions, additionalOptions, options.ipfs || {});
        this.type = options.type;
        if ((0, _values2.default)(constants.types).indexOf(this.type) < 0) {
            throw new Error('Invalid type');
        }
        this.events = new EventEmitter();
        this.logger = options.logger || defaultLogger;
        // Modules
        this.ipfsUtils = new IPFSUtils(this);
        this.orbitDb = new DB(this);
        this.pinning = new Pinning(this);
        this.room = new Room(this);
        this.reviewRecords = new ReviewRecords(this);
        this.validator = new Validator(this);
        this.persistence = new Persistence(this);
        this.serviceNode = new ServiceNode(this);
        this.crypto = new Crypto(this);
        this.ready = false;
        this.starting = false;
    }

    (0, _createClass3.default)(ChluIPFS, [{
        key: 'start',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                this.starting = true;
                                this.events.emit('starting');
                                this.logger.debug('Starting ChluIPFS, directory: ' + this.directory);

                                if (this.ipfs) {
                                    _context.next = 9;
                                    break;
                                }

                                this.logger.debug('Initializing IPFS');
                                _context.next = 7;
                                return IPFSUtils.createIPFS(this.ipfsOptions);

                            case 7:
                                this.ipfs = _context.sent;

                                this.logger.debug('Initialized IPFS');

                            case 9:
                                _context.next = 11;
                                return this.orbitDb.start();

                            case 11:
                                _context.next = 13;
                                return this.room.start();

                            case 13:
                                _context.next = 15;
                                return this.persistence.loadPersistedData();

                            case 15:
                                if (!(this.type === constants.types.customer && !this.orbitDb.getPersonalDBAddress())) {
                                    _context.next = 20;
                                    break;
                                }

                                _context.next = 18;
                                return this.orbitDb.openPersonalOrbitDB(constants.customerDbName);

                            case 18:
                                _context.next = 20;
                                return this.persistence.persistData();

                            case 20:
                                if (!(this.type === constants.types.customer)) {
                                    _context.next = 24;
                                    break;
                                }

                                // Broadcast my review updates DB, but don't fail if nobody replicates
                                this.room.broadcastReviewUpdates(false);
                                _context.next = 27;
                                break;

                            case 24:
                                if (!(this.type === constants.types.service)) {
                                    _context.next = 27;
                                    break;
                                }

                                _context.next = 27;
                                return this.serviceNode.start();

                            case 27:
                                this.ready = true;
                                this.starting = false;
                                this.events.emit('ready');
                                return _context.abrupt('return', true);

                            case 31:
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
                                this.events.emit('stopping');
                                this.ready = false;
                                _context2.next = 4;
                                return this.serviceNode.stop();

                            case 4:
                                _context2.next = 6;
                                return this.persistence.persistData();

                            case 6:
                                _context2.next = 8;
                                return this.orbitDb.stop();

                            case 8:
                                _context2.next = 10;
                                return this.room.stop();

                            case 10:
                                _context2.next = 12;
                                return this.ipfs.stop();

                            case 12:
                                this.events.emit('stop');
                                this.ipfs = undefined;

                            case 14:
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
        key: 'waitUntilReady',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3() {
                var _this = this;

                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                if (this.ready) {
                                    _context3.next = 7;
                                    break;
                                }

                                if (!this.starting) {
                                    _context3.next = 6;
                                    break;
                                }

                                _context3.next = 4;
                                return new _promise2.default(function (resolve) {
                                    _this.events.once('ready', resolve);
                                });

                            case 4:
                                _context3.next = 7;
                                break;

                            case 6:
                                throw new Error('The ChluIPFS node needs to be started');

                            case 7:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function waitUntilReady() {
                return _ref3.apply(this, arguments);
            }

            return waitUntilReady;
        }()
    }, {
        key: 'switchType',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(newType) {
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                if (!(this.type !== newType)) {
                                    _context4.next = 20;
                                    break;
                                }

                                this.starting = true;
                                this.events.emit('starting');
                                this.ready = false;
                                _context4.next = 6;
                                return this.persistence.persistData();

                            case 6:
                                if (!(this.type === constants.types.customer)) {
                                    _context4.next = 11;
                                    break;
                                }

                                if (!this.db) {
                                    _context4.next = 10;
                                    break;
                                }

                                _context4.next = 10;
                                return this.db.close();

                            case 10:
                                this.db = undefined;

                            case 11:
                                if (!(this.type === constants.types.service)) {
                                    _context4.next = 14;
                                    break;
                                }

                                _context4.next = 14;
                                return this.serviceNode.stop();

                            case 14:
                                this.type = newType;
                                _context4.next = 17;
                                return this.persistence.loadPersistedData();

                            case 17:
                                this.starting = false;
                                this.ready = true;
                                this.events.emit('ready');

                            case 20:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function switchType(_x2) {
                return _ref4.apply(this, arguments);
            }

            return switchType;
        }()
    }, {
        key: 'getOrbitDBAddress',
        value: function getOrbitDBAddress() {
            return this.orbitDb.getPersonalDBAddress();
        }
    }, {
        key: 'readReviewRecord',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(multihash) {
                var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                _context5.next = 2;
                                return this.waitUntilReady();

                            case 2:
                                _context5.next = 4;
                                return this.reviewRecords.readReviewRecord(multihash, options);

                            case 4:
                                return _context5.abrupt('return', _context5.sent);

                            case 5:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function readReviewRecord(_x4) {
                return _ref5.apply(this, arguments);
            }

            return readReviewRecord;
        }()
    }, {
        key: 'storeReviewRecord',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(reviewRecord) {
                var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                _context6.next = 2;
                                return this.waitUntilReady();

                            case 2:
                                _context6.next = 4;
                                return this.reviewRecords.storeReviewRecord(reviewRecord, options);

                            case 4:
                                return _context6.abrupt('return', _context6.sent);

                            case 5:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function storeReviewRecord(_x6) {
                return _ref6.apply(this, arguments);
            }

            return storeReviewRecord;
        }()
    }, {
        key: 'exportData',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7() {
                var exported;
                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                exported = {};

                                if (!(this.type === constants.types.customer)) {
                                    _context7.next = 9;
                                    break;
                                }

                                _context7.next = 4;
                                return this.db.keystore.exportPublicKey();

                            case 4:
                                _context7.t0 = _context7.sent;
                                _context7.next = 7;
                                return this.db.keystore.exportPrivateKey();

                            case 7:
                                _context7.t1 = _context7.sent;
                                exported.customerDbKeys = {
                                    pub: _context7.t0,
                                    priv: _context7.t1
                                };

                            case 9:
                                return _context7.abrupt('return', exported);

                            case 10:
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
                                throw new Error('not implemented');

                            case 1:
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
                                throw new Error('not implemented');

                            case 1:
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
                                throw new Error('not implemented');

                            case 1:
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
    }]);
    return ChluIPFS;
}();

module.exports = (0, _assign2.default)(ChluIPFS, constants);