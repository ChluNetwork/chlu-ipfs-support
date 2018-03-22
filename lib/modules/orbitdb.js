'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _values = require('babel-runtime/core-js/object/values');

var _values2 = _interopRequireDefault(_values);

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
var OrbitDB = require('orbit-db');
var IPFSUtils = require('../utils/ipfs');

var DB = function () {
    function DB(chluIpfs) {
        (0, _classCallCheck3.default)(this, DB);

        this.chluIpfs = chluIpfs;
        this.orbitDb = null;
        this.db = null;
    }

    (0, _createClass3.default)(DB, [{
        key: 'start',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                if (!this.orbitDb) {
                                    this.chluIpfs.logger.debug('Initializing OrbitDB with directory ' + this.chluIpfs.orbitDbDirectory);
                                    this.orbitDb = new OrbitDB(this.chluIpfs.ipfs, this.chluIpfs.orbitDbDirectory);
                                    this.chluIpfs.logger.debug('Initialized OrbitDB with directory ' + this.chluIpfs.orbitDbDirectory);
                                }

                                if (this.db) {
                                    _context.next = 4;
                                    break;
                                }

                                _context.next = 4;
                                return this.open();

                            case 4:
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
        key: 'getAddress',
        value: function getAddress() {
            return this.db.address.toString();
        }
    }, {
        key: 'stop',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2() {
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (!this.db) {
                                    _context2.next = 3;
                                    break;
                                }

                                _context2.next = 3;
                                return this.db.close();

                            case 3:
                                if (!this.orbitDb) {
                                    _context2.next = 6;
                                    break;
                                }

                                _context2.next = 6;
                                return this.orbitDb.stop();

                            case 6:
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
        key: 'getReviewRecordList',
        value: function getReviewRecordList() {
            return (0, _values2.default)(this.db._index._index);
        }
    }, {
        key: 'get',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(multihash) {
                var stack = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [multihash];
                var next;
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                IPFSUtils.validateMultihash(multihash);
                                next = void 0;
                                _context3.next = 4;
                                return this.db.get(multihash);

                            case 4:
                                next = _context3.sent;

                                if (!(IPFSUtils.isValidMultihash(next) && stack.indexOf(next) === -1)) {
                                    _context3.next = 12;
                                    break;
                                }

                                // One next iteration
                                this.chluIpfs.logger.debug('Found forward pointer from ' + multihash + ' to ' + next);
                                _context3.next = 9;
                                return this.get(next, stack.concat(next));

                            case 9:
                                return _context3.abrupt('return', _context3.sent);

                            case 12:
                                return _context3.abrupt('return', stack[stack.length - 1]);

                            case 13:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function get(_x2) {
                return _ref3.apply(this, arguments);
            }

            return get;
        }()
    }, {
        key: 'set',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(multihash) {
                var previousVersionMultihash = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                if (!previousVersionMultihash) {
                                    _context4.next = 5;
                                    break;
                                }

                                _context4.next = 3;
                                return this.db.set(previousVersionMultihash, multihash);

                            case 3:
                                _context4.next = 7;
                                break;

                            case 5:
                                _context4.next = 7;
                                return this.db.set(multihash, multihash);

                            case 7:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function set(_x4) {
                return _ref4.apply(this, arguments);
            }

            return set;
        }()
    }, {
        key: 'setAndWaitForReplication',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(multihash) {
                var _this = this;

                var previousVersionMultihash = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                _context5.next = 2;
                                return new _promise2.default(function (resolve, reject) {
                                    _this.chluIpfs.events.once(constants.eventTypes.replicated + '_' + _this.getAddress(), function () {
                                        return resolve();
                                    });
                                    _this.set(multihash, previousVersionMultihash).catch(reject);
                                });

                            case 2:
                                return _context5.abrupt('return', _context5.sent);

                            case 3:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function setAndWaitForReplication(_x6) {
                return _ref5.apply(this, arguments);
            }

            return setAndWaitForReplication;
        }()
    }, {
        key: 'open',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6() {
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                this.chluIpfs.logger.debug('Opening Chlu OrbitDB');
                                _context6.next = 3;
                                return this.orbitDb.kvstore(constants.orbitDbName, {
                                    write: ['*']
                                });

                            case 3:
                                this.db = _context6.sent;

                                this.listenToDBEvents(this.db);
                                this.chluIpfs.logger.debug('Loading Chlu OrbitDB cache');
                                _context6.next = 8;
                                return this.db.load();

                            case 8:
                                this.chluIpfs.logger.debug('Chlu OrbitDB fully ready');
                                return _context6.abrupt('return', this.db);

                            case 10:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function open() {
                return _ref6.apply(this, arguments);
            }

            return open;
        }()
    }, {
        key: 'listenToDBEvents',
        value: function listenToDBEvents(db) {
            var _this2 = this;

            db.events.on('replicated', function (address) {
                _this2.chluIpfs.logger.debug('OrbitDB Event: Replicated ' + address);
                _this2.chluIpfs.events.emit('replicated', address);
                _this2.chluIpfs.room.broadcast({ type: constants.eventTypes.replicated, address: address }).catch(function (err) {
                    return _this2.chluIpfs.logger.error('Broadcast failed: ' + err.message);
                });
            });
            db.events.on('replicate', function (address) {
                _this2.chluIpfs.logger.debug('OrbitDB Event: Replicate ' + address);
                _this2.chluIpfs.events.emit('replicate', address);
            });
            db.events.on('replicate.progress', function (address, hash, entry, progress) {
                _this2.chluIpfs.logger.debug('OrbitDB Event: Replicate Progress ' + progress + ' for address ' + address);
                _this2.chluIpfs.events.emit('replicate.progress', address, hash, entry, progress);
            });
            db.events.on('ready', function () {
                return _this2.chluIpfs.logger.debug('OrbitDB Event: Ready');
            });
            db.events.on('write', function () {
                return _this2.chluIpfs.logger.debug('OrbitDB Event: Write');
            });
            db.events.on('load', function () {
                return _this2.chluIpfs.logger.debug('OrbitDB Event: Load');
            });
            db.events.on('load.progress', function (address, hash, entry, progress, total) {
                _this2.chluIpfs.logger.debug('OrbitDB Event: Load Progress ' + progress + '/' + total + ' for address ' + address);
            });
        }
    }]);
    return DB;
}();

module.exports = DB;