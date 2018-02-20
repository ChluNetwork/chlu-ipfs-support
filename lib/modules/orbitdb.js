'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

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

var DB = function () {
    function DB(chluIpfs) {
        (0, _classCallCheck3.default)(this, DB);

        this.chluIpfs = chluIpfs;
        this.dbs = {};
        this.db = null;
    }

    (0, _createClass3.default)(DB, [{
        key: 'getPersonalDBAddress',
        value: function getPersonalDBAddress() {
            return this.db ? this.db.address.toString() : null;
        }
    }, {
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

                            case 1:
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
                                if (!this.orbitDb) {
                                    _context2.next = 3;
                                    break;
                                }

                                _context2.next = 3;
                                return this.orbitDb.stop();

                            case 3:
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
        key: 'openPersonalOrbitDB',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3() {
                var address = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                if (!address) {
                                    _context3.next = 8;
                                    break;
                                }

                                // Open previously created Customer Review Update DB
                                this.chluIpfs.logger.debug('Opening existing Personal OrbitDB');
                                _context3.next = 4;
                                return this.openDb(address);

                            case 4:
                                this.db = _context3.sent;

                                if (this.db) this.chluIpfs.logger.debug('Opened existing Personal OrbitDB');
                                _context3.next = 12;
                                break;

                            case 8:
                                _context3.next = 10;
                                return this.openDb(constants.customerDbName);

                            case 10:
                                this.db = _context3.sent;

                                this.chluIpfs.logger.debug('Created Personal OrbitDB');

                            case 12:
                                return _context3.abrupt('return', this.db);

                            case 13:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function openPersonalOrbitDB() {
                return _ref3.apply(this, arguments);
            }

            return openPersonalOrbitDB;
        }()
    }, {
        key: 'openDb',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(address) {
                var db;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                this.chluIpfs.logger.debug('Opening ' + address);
                                db = void 0;
                                _context4.prev = 2;
                                _context4.next = 5;
                                return this.orbitDb.kvstore(address);

                            case 5:
                                db = _context4.sent;

                                this.listenToDBEvents(db);
                                _context4.next = 9;
                                return db.load();

                            case 9:
                                this.chluIpfs.logger.debug('Opened ' + address);
                                _context4.next = 15;
                                break;

                            case 12:
                                _context4.prev = 12;
                                _context4.t0 = _context4['catch'](2);

                                this.chluIpfs.logger.error('Coud not Open ' + address + ': ' + _context4.t0.message || _context4.t0);

                            case 15:
                                return _context4.abrupt('return', db);

                            case 16:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this, [[2, 12]]);
            }));

            function openDb(_x2) {
                return _ref4.apply(this, arguments);
            }

            return openDb;
        }()
    }, {
        key: 'openDbForReplication',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(address) {
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                if (this.dbs[address]) {
                                    _context5.next = 7;
                                    break;
                                }

                                _context5.next = 3;
                                return this.openDb(address);

                            case 3:
                                this.dbs[address] = _context5.sent;

                                if (!this.dbs[address]) {
                                    _context5.next = 7;
                                    break;
                                }

                                _context5.next = 7;
                                return this.chluIpfs.persistence.persistData();

                            case 7:
                                return _context5.abrupt('return', this.dbs[address]);

                            case 8:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function openDbForReplication(_x3) {
                return _ref5.apply(this, arguments);
            }

            return openDbForReplication;
        }()
    }, {
        key: 'openDbs',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(addresses) {
                var _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, address;

                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                this.chluIpfs.logger.debug('Opening ' + addresses.length + ' OrbitDBs');
                                _iteratorNormalCompletion = true;
                                _didIteratorError = false;
                                _iteratorError = undefined;
                                _context6.prev = 4;
                                _iterator = (0, _getIterator3.default)(addresses);

                            case 6:
                                if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                                    _context6.next = 14;
                                    break;
                                }

                                address = _step.value;
                                _context6.next = 10;
                                return this.openDb(address);

                            case 10:
                                this.dbs[address] = _context6.sent;

                            case 11:
                                _iteratorNormalCompletion = true;
                                _context6.next = 6;
                                break;

                            case 14:
                                _context6.next = 20;
                                break;

                            case 16:
                                _context6.prev = 16;
                                _context6.t0 = _context6['catch'](4);
                                _didIteratorError = true;
                                _iteratorError = _context6.t0;

                            case 20:
                                _context6.prev = 20;
                                _context6.prev = 21;

                                if (!_iteratorNormalCompletion && _iterator.return) {
                                    _iterator.return();
                                }

                            case 23:
                                _context6.prev = 23;

                                if (!_didIteratorError) {
                                    _context6.next = 26;
                                    break;
                                }

                                throw _iteratorError;

                            case 26:
                                return _context6.finish(23);

                            case 27:
                                return _context6.finish(20);

                            case 28:
                                this.chluIpfs.logger.debug('Opened all persisted OrbitDBs');

                            case 29:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this, [[4, 16, 20, 28], [21,, 23, 27]]);
            }));

            function openDbs(_x4) {
                return _ref6.apply(this, arguments);
            }

            return openDbs;
        }()
    }, {
        key: 'replicate',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(address) {
                var _this = this;

                var db;
                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                this.chluIpfs.logger.info('Replicating ' + address);
                                _context7.next = 3;
                                return this.openDbForReplication(address);

                            case 3:
                                db = _context7.sent;

                                if (!db) {
                                    _context7.next = 10;
                                    break;
                                }

                                this.chluIpfs.room.broadcast({ type: constants.eventTypes.replicating, address: address });
                                _context7.next = 8;
                                return new _promise2.default(function (resolve) {
                                    _this.chluIpfs.logger.debug('Waiting for next replication of ' + address);
                                    db.events.once('replicated', resolve);
                                    db.events.once('ready', resolve);
                                });

                            case 8:
                                this.chluIpfs.room.broadcast({ type: constants.eventTypes.replicated, address: address });
                                this.chluIpfs.logger.info('Replicated ' + address);

                            case 10:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function replicate(_x5) {
                return _ref7.apply(this, arguments);
            }

            return replicate;
        }()
    }, {
        key: 'listenToDBEvents',
        value: function listenToDBEvents(db) {
            var _this2 = this;

            db.events.on('replicated', function (address) {
                _this2.chluIpfs.logger.debug('OrbitDB Event: Replicated ' + address);
            });
            db.events.on('replicate', function (address) {
                _this2.chluIpfs.logger.debug('OrbitDB Event: Replicate ' + address);
            });
            db.events.on('replicate.progress', function (address, hash, entry, progress) {
                _this2.chluIpfs.logger.debug('OrbitDB Event: Replicate Progress ' + progress + ' for address ' + address);
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