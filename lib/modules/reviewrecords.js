'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var protons = require('protons');
var multihashes = require('multihashes');
var multihashing = require('multihashing-async');
var constants = require('../constants');
var protobuf = protons(require('../utils/protobuf'));
var IPFSUtils = require('./ipfs');

var ReviewRecords = function () {
    function ReviewRecords(chluIpfs) {
        (0, _classCallCheck3.default)(this, ReviewRecords);

        this.chluIpfs = chluIpfs;
    }

    (0, _createClass3.default)(ReviewRecords, [{
        key: 'getLastReviewRecordUpdate',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(db, multihash) {
                var dbValue, updatedMultihash, path, error;
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                this.chluIpfs.logger.debug('Checking for review updates for ' + multihash);
                                dbValue = multihash, updatedMultihash = multihash, path = [multihash];

                            case 2:
                                if (!dbValue) {
                                    _context.next = 18;
                                    break;
                                }

                                _context.next = 5;
                                return db.get(dbValue);

                            case 5:
                                dbValue = _context.sent;

                                if (!(typeof dbValue === 'string')) {
                                    _context.next = 16;
                                    break;
                                }

                                if (!(path.indexOf(dbValue) < 0)) {
                                    _context.next = 13;
                                    break;
                                }

                                updatedMultihash = dbValue;
                                path.push(dbValue);
                                this.chluIpfs.logger.debug('Found forward pointer from ' + multihash + ' to ' + updatedMultihash);
                                _context.next = 16;
                                break;

                            case 13:
                                error = new Error('Recursive references detected in this OrbitDB: ' + db.address.toString());

                                this.chluIpfs.events.emit('error', error);
                                throw error;

                            case 16:
                                _context.next = 2;
                                break;

                            case 18:
                                if (!(multihash != updatedMultihash)) {
                                    _context.next = 23;
                                    break;
                                }

                                this.chluIpfs.logger.debug(multihash + ' updates to ' + updatedMultihash);
                                return _context.abrupt('return', updatedMultihash);

                            case 23:
                                this.chluIpfs.logger.debug('no updates found for ' + multihash);

                            case 24:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function getLastReviewRecordUpdate(_x, _x2) {
                return _ref.apply(this, arguments);
            }

            return getLastReviewRecordUpdate;
        }()
    }, {
        key: 'notifyIfReviewIsUpdated',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(db, multihash, notifyUpdate) {
                var updatedMultihash, reviewRecord;
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                _context2.next = 2;
                                return this.getLastReviewRecordUpdate(db, multihash);

                            case 2:
                                updatedMultihash = _context2.sent;

                                if (!updatedMultihash) {
                                    _context2.next = 14;
                                    break;
                                }

                                _context2.prev = 4;
                                _context2.next = 7;
                                return this.readReviewRecord(updatedMultihash);

                            case 7:
                                reviewRecord = _context2.sent;

                                notifyUpdate(multihash, updatedMultihash, reviewRecord);
                                _context2.next = 14;
                                break;

                            case 11:
                                _context2.prev = 11;
                                _context2.t0 = _context2['catch'](4);

                                this.chluIpfs.logger.error('Review update ' + updatedMultihash + ' for ' + multihash + ' was invalid: ' + _context2.t0);

                            case 14:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this, [[4, 11]]);
            }));

            function notifyIfReviewIsUpdated(_x3, _x4, _x5) {
                return _ref2.apply(this, arguments);
            }

            return notifyIfReviewIsUpdated;
        }()
    }, {
        key: 'findLastReviewRecordUpdate',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(multihash, notifyUpdate) {
                var _this = this;

                var reviewRecord, getDb, notify;
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                _context5.next = 2;
                                return this.getReviewRecord(multihash);

                            case 2:
                                reviewRecord = _context5.sent;

                                if (reviewRecord.orbitDb) {
                                    getDb = function () {
                                        var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(address) {
                                            return _regenerator2.default.wrap(function _callee3$(_context3) {
                                                while (1) {
                                                    switch (_context3.prev = _context3.next) {
                                                        case 0:
                                                            if (!(_this.chluIpfs.orbitDb.getPersonalDBAddress() === address)) {
                                                                _context3.next = 4;
                                                                break;
                                                            }

                                                            return _context3.abrupt('return', _this.chluIpfs.orbitDb.db);

                                                        case 4:
                                                            _context3.next = 6;
                                                            return _this.chluIpfs.orbitDb.openDbForReplication(address);

                                                        case 6:
                                                            return _context3.abrupt('return', _context3.sent);

                                                        case 7:
                                                        case 'end':
                                                            return _context3.stop();
                                                    }
                                                }
                                            }, _callee3, _this);
                                        }));

                                        return function getDb(_x8) {
                                            return _ref4.apply(this, arguments);
                                        };
                                    }();

                                    notify = function () {
                                        var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(address) {
                                            return _regenerator2.default.wrap(function _callee4$(_context4) {
                                                while (1) {
                                                    switch (_context4.prev = _context4.next) {
                                                        case 0:
                                                            if (!(address === reviewRecord.orbitDb)) {
                                                                _context4.next = 8;
                                                                break;
                                                            }

                                                            _context4.t0 = _this;
                                                            _context4.next = 4;
                                                            return getDb(address);

                                                        case 4:
                                                            _context4.t1 = _context4.sent;
                                                            _context4.t2 = multihash;
                                                            _context4.t3 = notifyUpdate;

                                                            _context4.t0.notifyIfReviewIsUpdated.call(_context4.t0, _context4.t1, _context4.t2, _context4.t3);

                                                        case 8:
                                                        case 'end':
                                                            return _context4.stop();
                                                    }
                                                }
                                            }, _callee4, _this);
                                        }));

                                        return function notify(_x9) {
                                            return _ref5.apply(this, arguments);
                                        };
                                    }();

                                    this.chluIpfs.events.on('replicated', function (address) {
                                        return notify(address);
                                    });
                                    this.chluIpfs.events.on('updated ReviewRecord', function (previousVersionMultihash, multihash, rr) {
                                        if (rr && rr.orbitDb) notify(rr.orbitDb);
                                    });
                                    notify(reviewRecord.orbitDb);
                                }

                            case 4:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function findLastReviewRecordUpdate(_x6, _x7) {
                return _ref3.apply(this, arguments);
            }

            return findLastReviewRecordUpdate;
        }()
    }, {
        key: 'getHistory',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(reviewRecord) {
                var history = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
                var prev, prevReviewRecord;
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                prev = reviewRecord.previous_version_multihash;

                                if (!prev) {
                                    _context6.next = 13;
                                    break;
                                }

                                if (!(history.map(function (o) {
                                    return o.multihash;
                                }).indexOf(prev) >= 0)) {
                                    _context6.next = 4;
                                    break;
                                }

                                throw new Error('Recursive history detected');

                            case 4:
                                _context6.next = 6;
                                return this.chluIpfs.reviewRecords.readReviewRecord(prev, { validate: false });

                            case 6:
                                prevReviewRecord = _context6.sent;

                                history.push({
                                    multihash: prev,
                                    reviewRecord: prevReviewRecord
                                });
                                _context6.next = 10;
                                return this.getHistory(prevReviewRecord, history);

                            case 10:
                                return _context6.abrupt('return', _context6.sent);

                            case 13:
                                return _context6.abrupt('return', history);

                            case 14:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function getHistory(_x11) {
                return _ref6.apply(this, arguments);
            }

            return getHistory;
        }()
    }, {
        key: 'getReviewRecord',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(multihash) {
                var buffer;
                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                _context7.next = 2;
                                return this.chluIpfs.ipfsUtils.get(multihash);

                            case 2:
                                buffer = _context7.sent;
                                return _context7.abrupt('return', protobuf.ReviewRecord.decode(buffer));

                            case 4:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function getReviewRecord(_x12) {
                return _ref7.apply(this, arguments);
            }

            return getReviewRecord;
        }()
    }, {
        key: 'readReviewRecord',
        value: function () {
            var _ref8 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee8(multihash) {
                var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

                var _options$notifyUpdate, notifyUpdate, _options$validate, validate, reviewRecord, validateOptions;

                return _regenerator2.default.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                _options$notifyUpdate = options.notifyUpdate, notifyUpdate = _options$notifyUpdate === undefined ? null : _options$notifyUpdate, _options$validate = options.validate, validate = _options$validate === undefined ? true : _options$validate;

                                IPFSUtils.validateMultihash(multihash);
                                _context8.next = 4;
                                return this.getReviewRecord(multihash);

                            case 4:
                                reviewRecord = _context8.sent;

                                if (!validate) {
                                    _context8.next = 16;
                                    break;
                                }

                                validateOptions = (typeof validate === 'undefined' ? 'undefined' : (0, _typeof3.default)(validate)) === 'object' ? validate : {};
                                _context8.prev = 7;
                                _context8.next = 10;
                                return this.chluIpfs.validator.validateReviewRecord(reviewRecord, validateOptions);

                            case 10:
                                _context8.next = 16;
                                break;

                            case 12:
                                _context8.prev = 12;
                                _context8.t0 = _context8['catch'](7);

                                this.chluIpfs.events.emit('validation error', _context8.t0, multihash);
                                throw _context8.t0;

                            case 16:
                                if (notifyUpdate) this.findLastReviewRecordUpdate(multihash, notifyUpdate);
                                this.chluIpfs.events.emit('read ReviewRecord', { reviewRecord: reviewRecord, multihash: multihash });
                                return _context8.abrupt('return', reviewRecord);

                            case 19:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this, [[7, 12]]);
            }));

            function readReviewRecord(_x14) {
                return _ref8.apply(this, arguments);
            }

            return readReviewRecord;
        }()
    }, {
        key: 'prepareReviewRecord',
        value: function () {
            var _ref9 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee9(reviewRecord) {
                var validate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
                return _regenerator2.default.wrap(function _callee9$(_context9) {
                    while (1) {
                        switch (_context9.prev = _context9.next) {
                            case 0:
                                if (!(this.chluIpfs.type === constants.types.customer)) {
                                    _context9.next = 4;
                                    break;
                                }

                                reviewRecord.orbitDb = this.chluIpfs.getOrbitDBAddress();
                                _context9.next = 6;
                                break;

                            case 4:
                                if (reviewRecord.orbitDb) {
                                    _context9.next = 6;
                                    break;
                                }

                                throw new Error('Can not set the orbitDb address since this is not a customer');

                            case 6:
                                reviewRecord = this.setPointerToLastReviewRecord(reviewRecord);
                                _context9.next = 9;
                                return this.hashReviewRecord(reviewRecord);

                            case 9:
                                reviewRecord = _context9.sent;

                                if (!validate) {
                                    _context9.next = 13;
                                    break;
                                }

                                _context9.next = 13;
                                return this.chluIpfs.validator.validateReviewRecord(reviewRecord);

                            case 13:
                                return _context9.abrupt('return', reviewRecord);

                            case 14:
                            case 'end':
                                return _context9.stop();
                        }
                    }
                }, _callee9, this);
            }));

            function prepareReviewRecord(_x16) {
                return _ref9.apply(this, arguments);
            }

            return prepareReviewRecord;
        }()
    }, {
        key: 'storeReviewRecord',
        value: function () {
            var _ref10 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee10(reviewRecord) {
                var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

                var previousVersionMultihash, _options$publish, publish, _options$validate2, validate, rr, buffer, dagNode, multihash;

                return _regenerator2.default.wrap(function _callee10$(_context10) {
                    while (1) {
                        switch (_context10.prev = _context10.next) {
                            case 0:
                                previousVersionMultihash = options.previousVersionMultihash, _options$publish = options.publish, publish = _options$publish === undefined ? true : _options$publish, _options$validate2 = options.validate, validate = _options$validate2 === undefined ? true : _options$validate2;
                                _context10.next = 3;
                                return this.prepareReviewRecord(reviewRecord, validate);

                            case 3:
                                rr = _context10.sent;
                                buffer = protobuf.ReviewRecord.encode(rr);
                                _context10.next = 7;
                                return this.chluIpfs.ipfsUtils.createDAGNode(buffer);

                            case 7:
                                dagNode = _context10.sent;
                                // don't store to IPFS yet
                                multihash = IPFSUtils.getDAGNodeMultihash(dagNode);

                                if (!options.expectedMultihash) {
                                    _context10.next = 12;
                                    break;
                                }

                                if (!(options.expectedMultihash !== multihash)) {
                                    _context10.next = 12;
                                    break;
                                }

                                throw new Error('Expected a different multihash');

                            case 12:
                                this.chluIpfs.events.emit('stored ReviewRecord', { multihash: multihash, reviewRecord: rr });

                                if (!publish) {
                                    _context10.next = 16;
                                    break;
                                }

                                _context10.next = 16;
                                return this.publishReviewRecord(dagNode, previousVersionMultihash, multihash, rr);

                            case 16:
                                return _context10.abrupt('return', multihash);

                            case 17:
                            case 'end':
                                return _context10.stop();
                        }
                    }
                }, _callee10, this);
            }));

            function storeReviewRecord(_x18) {
                return _ref10.apply(this, arguments);
            }

            return storeReviewRecord;
        }()
    }, {
        key: 'publishReviewRecord',
        value: function () {
            var _ref11 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee11(dagNode, previousVersionMultihash, expectedMultihash, reviewRecord) {
                var multihash, tasksToAwait;
                return _regenerator2.default.wrap(function _callee11$(_context11) {
                    while (1) {
                        switch (_context11.prev = _context11.next) {
                            case 0:
                                _context11.next = 2;
                                return this.chluIpfs.ipfsUtils.storeDAGNode(dagNode);

                            case 2:
                                multihash = _context11.sent;

                                if (!(expectedMultihash && multihash !== expectedMultihash)) {
                                    _context11.next = 5;
                                    break;
                                }

                                throw new Error('Multihash mismatch when publishing');

                            case 5:
                                // Wait for it to be remotely pinned
                                tasksToAwait = [this.waitForRemotePin(multihash)];

                                if (previousVersionMultihash) {
                                    // This is a review update
                                    tasksToAwait.push(this.setForwardPointerForReviewRecord(previousVersionMultihash, multihash, reviewRecord));
                                }
                                _context11.next = 9;
                                return _promise2.default.all(tasksToAwait);

                            case 9:
                                // Operation succeeded: set this as the last review record published
                                this.chluIpfs.lastReviewRecordMultihash = multihash;
                                _context11.next = 12;
                                return this.chluIpfs.persistence.persistData();

                            case 12:
                                this.chluIpfs.events.emit('published ReviewRecord', multihash);

                            case 13:
                            case 'end':
                                return _context11.stop();
                        }
                    }
                }, _callee11, this);
            }));

            function publishReviewRecord(_x19, _x20, _x21, _x22) {
                return _ref11.apply(this, arguments);
            }

            return publishReviewRecord;
        }()
    }, {
        key: 'waitForRemotePin',
        value: function () {
            var _ref12 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee12(multihash) {
                return _regenerator2.default.wrap(function _callee12$(_context12) {
                    while (1) {
                        switch (_context12.prev = _context12.next) {
                            case 0:
                                _context12.next = 2;
                                return this.chluIpfs.room.broadcastUntil({
                                    type: constants.eventTypes.wroteReviewRecord,
                                    multihash: multihash
                                }, constants.eventTypes.pinned + '_' + multihash);

                            case 2:
                            case 'end':
                                return _context12.stop();
                        }
                    }
                }, _callee12, this);
            }));

            function waitForRemotePin(_x23) {
                return _ref12.apply(this, arguments);
            }

            return waitForRemotePin;
        }()
    }, {
        key: 'setForwardPointerForReviewRecord',
        value: function () {
            var _ref13 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee14(previousVersionMultihash, multihash, reviewRecord) {
                var _this2 = this;

                return _regenerator2.default.wrap(function _callee14$(_context14) {
                    while (1) {
                        switch (_context14.prev = _context14.next) {
                            case 0:
                                this.chluIpfs.logger.debug('Setting forward pointer for ' + previousVersionMultihash + ' to ' + multihash);
                                // TODO: verify that the update is valid
                                _context14.next = 3;
                                return new _promise2.default(function () {
                                    var _ref14 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee13(resolve) {
                                        return _regenerator2.default.wrap(function _callee13$(_context13) {
                                            while (1) {
                                                switch (_context13.prev = _context13.next) {
                                                    case 0:
                                                        _this2.chluIpfs.room.broadcastReviewUpdates().then(function () {
                                                            return resolve();
                                                        });
                                                        _context13.prev = 1;
                                                        _context13.next = 4;
                                                        return _this2.chluIpfs.orbitDb.db.set(previousVersionMultihash, multihash);

                                                    case 4:
                                                        _context13.next = 9;
                                                        break;

                                                    case 6:
                                                        _context13.prev = 6;
                                                        _context13.t0 = _context13['catch'](1);

                                                        _this2.chluIpfs.logger.error('OrbitDB Error: ' + _context13.t0.message || _context13.t0);

                                                    case 9:
                                                        _this2.chluIpfs.logger.debug('Waiting for remote replication');

                                                    case 10:
                                                    case 'end':
                                                        return _context13.stop();
                                                }
                                            }
                                        }, _callee13, _this2, [[1, 6]]);
                                    }));

                                    return function (_x27) {
                                        return _ref14.apply(this, arguments);
                                    };
                                }());

                            case 3:
                                this.chluIpfs.logger.debug('Done setting forward pointer, the db has been replicated remotely');
                                this.chluIpfs.events.emit('updated ReviewRecord', previousVersionMultihash, multihash, reviewRecord);
                                return _context14.abrupt('return', multihash);

                            case 6:
                            case 'end':
                                return _context14.stop();
                        }
                    }
                }, _callee14, this);
            }));

            function setForwardPointerForReviewRecord(_x24, _x25, _x26) {
                return _ref13.apply(this, arguments);
            }

            return setForwardPointerForReviewRecord;
        }()
    }, {
        key: 'hashObject',
        value: function () {
            var _ref15 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee15(obj, encoder) {
                var name, _multihash, decoded, toHash, multihash;

                return _regenerator2.default.wrap(function _callee15$(_context15) {
                    while (1) {
                        switch (_context15.prev = _context15.next) {
                            case 0:
                                name = void 0;

                                try {
                                    // Try to detect existing multihash type
                                    _multihash = multihashes.fromB58String(obj.hash);
                                    decoded = multihashes.decode(_multihash);

                                    name = decoded.name;
                                } catch (error) {
                                    // Use default
                                    name = 'sha2-256';
                                }
                                obj.hash = '';
                                this.chluIpfs.logger.debug('Preparing to hash the object: ' + (0, _stringify2.default)(obj));
                                toHash = encoder(obj);
                                _context15.next = 7;
                                return new _promise2.default(function (resolve, reject) {
                                    multihashing(toHash, name, function (err, multihash) {
                                        if (err) reject(err);else resolve(multihash);
                                    });
                                });

                            case 7:
                                multihash = _context15.sent;

                                obj.hash = multihashes.toB58String(multihash);
                                this.chluIpfs.logger.debug('Hashed to ' + obj.hash + ' the object ' + (0, _stringify2.default)(obj));
                                return _context15.abrupt('return', obj);

                            case 11:
                            case 'end':
                                return _context15.stop();
                        }
                    }
                }, _callee15, this);
            }));

            function hashObject(_x28, _x29) {
                return _ref15.apply(this, arguments);
            }

            return hashObject;
        }()
    }, {
        key: 'hashReviewRecord',
        value: function () {
            var _ref16 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee16(reviewRecord) {
                return _regenerator2.default.wrap(function _callee16$(_context16) {
                    while (1) {
                        switch (_context16.prev = _context16.next) {
                            case 0:
                                if (!reviewRecord.last_reviewrecord_multihash) {
                                    reviewRecord.last_reviewrecord_multihash = '';
                                }
                                _context16.next = 3;
                                return this.hashObject(reviewRecord, protobuf.ReviewRecord.encode);

                            case 3:
                                return _context16.abrupt('return', _context16.sent);

                            case 4:
                            case 'end':
                                return _context16.stop();
                        }
                    }
                }, _callee16, this);
            }));

            function hashReviewRecord(_x30) {
                return _ref16.apply(this, arguments);
            }

            return hashReviewRecord;
        }()
    }, {
        key: 'hashPoPR',
        value: function () {
            var _ref17 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee17(popr) {
                return _regenerator2.default.wrap(function _callee17$(_context17) {
                    while (1) {
                        switch (_context17.prev = _context17.next) {
                            case 0:
                                _context17.next = 2;
                                return this.hashObject(popr, protobuf.PoPR.encode);

                            case 2:
                                return _context17.abrupt('return', _context17.sent);

                            case 3:
                            case 'end':
                                return _context17.stop();
                        }
                    }
                }, _callee17, this);
            }));

            function hashPoPR(_x31) {
                return _ref17.apply(this, arguments);
            }

            return hashPoPR;
        }()
    }, {
        key: 'setPointerToLastReviewRecord',
        value: function setPointerToLastReviewRecord(reviewRecord) {
            reviewRecord.last_reviewrecord_multihash = this.chluIpfs.lastReviewRecordMultihash || '';
            return reviewRecord;
        }
    }]);
    return ReviewRecords;
}();

module.exports = ReviewRecords;