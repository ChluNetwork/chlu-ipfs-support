'use strict';

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

var protons = require('protons');
var constants = require('../constants');
var protobuf = protons(require('../utils/protobuf'));

var ReviewRecords = function () {
    function ReviewRecords(chluIpfs) {
        (0, _classCallCheck3.default)(this, ReviewRecords);

        this.chluIpfs = chluIpfs;
    }

    (0, _createClass3.default)(ReviewRecords, [{
        key: 'getLastReviewRecordUpdate',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(db, multihash) {
                var dbValue, updatedMultihash, path;
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                this.chluIpfs.logger.debug('Checking for review updates for ' + multihash);
                                dbValue = multihash, updatedMultihash = multihash, path = [multihash];

                            case 2:
                                if (!dbValue) {
                                    _context.next = 16;
                                    break;
                                }

                                _context.next = 5;
                                return db.get(dbValue);

                            case 5:
                                dbValue = _context.sent;

                                if (!(typeof dbValue === 'string')) {
                                    _context.next = 14;
                                    break;
                                }

                                if (!(path.indexOf(dbValue) < 0)) {
                                    _context.next = 13;
                                    break;
                                }

                                updatedMultihash = dbValue;
                                path.push(dbValue);
                                this.chluIpfs.logger.debug('Found forward pointer from ' + multihash + ' to ' + updatedMultihash);
                                _context.next = 14;
                                break;

                            case 13:
                                throw new Error('Recursive references detected in this OrbitDB: ' + db.address.toString());

                            case 14:
                                _context.next = 2;
                                break;

                            case 16:
                                if (!(multihash != updatedMultihash)) {
                                    _context.next = 21;
                                    break;
                                }

                                this.chluIpfs.logger.debug(multihash + ' updates to ' + updatedMultihash);
                                return _context.abrupt('return', updatedMultihash);

                            case 21:
                                this.chluIpfs.logger.debug('no updates found for ' + multihash);

                            case 22:
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
                var updatedMultihash;
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                _context2.next = 2;
                                return this.getLastReviewRecordUpdate(db, multihash);

                            case 2:
                                updatedMultihash = _context2.sent;

                                if (updatedMultihash) {
                                    // TODO: Check that the update is valid first
                                    notifyUpdate(multihash, updatedMultihash);
                                }

                            case 4:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function notifyIfReviewIsUpdated(_x3, _x4, _x5) {
                return _ref2.apply(this, arguments);
            }

            return notifyIfReviewIsUpdated;
        }()
    }, {
        key: 'findLastReviewRecordUpdate',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(multihash, notifyUpdate) {
                var _this = this;

                var reviewRecord, db;
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                _context3.next = 2;
                                return this.getReviewRecord(multihash);

                            case 2:
                                reviewRecord = _context3.sent;

                                if (!reviewRecord.orbitDb) {
                                    _context3.next = 9;
                                    break;
                                }

                                _context3.next = 6;
                                return this.chluIpfs.openDbForReplication(reviewRecord.orbitDb);

                            case 6:
                                db = _context3.sent;

                                db.events.once('replicated', function () {
                                    return _this.notifyIfReviewIsUpdated(db, multihash, notifyUpdate);
                                });
                                this.notifyIfReviewIsUpdated(db, multihash, notifyUpdate);

                            case 9:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function findLastReviewRecordUpdate(_x6, _x7) {
                return _ref3.apply(this, arguments);
            }

            return findLastReviewRecordUpdate;
        }()
    }, {
        key: 'getReviewRecord',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(multihash) {
                var dagNode, buffer, reviewRecord;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                _context4.next = 2;
                                return this.chluIpfs.ipfs.object.get(this.chluIpfs.utils.multihashToBuffer(multihash));

                            case 2:
                                dagNode = _context4.sent;
                                buffer = dagNode.data;
                                reviewRecord = protobuf.ReviewRecord.decode(buffer);
                                return _context4.abrupt('return', reviewRecord);

                            case 6:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function getReviewRecord(_x8) {
                return _ref4.apply(this, arguments);
            }

            return getReviewRecord;
        }()
    }, {
        key: 'readReviewRecord',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(multihash) {
                var notifyUpdate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
                var reviewRecord;
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                this.chluIpfs.utils.validateMultihash(multihash);
                                _context5.next = 3;
                                return this.getReviewRecord(multihash);

                            case 3:
                                reviewRecord = _context5.sent;

                                // TODO validate
                                if (notifyUpdate) this.findLastReviewRecordUpdate(multihash, notifyUpdate);
                                return _context5.abrupt('return', reviewRecord);

                            case 6:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function readReviewRecord(_x10) {
                return _ref5.apply(this, arguments);
            }

            return readReviewRecord;
        }()
    }, {
        key: 'storeReviewRecord',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(reviewRecord) {
                var _this2 = this;

                var previousVersionMultihash = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
                var buffer, dagNode, multihash, tasksToAwait;
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                if (!(this.chluIpfs.type !== constants.types.customer)) {
                                    _context6.next = 2;
                                    break;
                                }

                                throw new Error('Not a customer');

                            case 2:
                                reviewRecord.orbitDb = this.chluIpfs.getOrbitDBAddress();
                                buffer = protobuf.ReviewRecord.encode(reviewRecord);
                                // TODO validate
                                // write thing to ipfs

                                _context6.next = 6;
                                return this.chluIpfs.ipfs.object.put(buffer);

                            case 6:
                                dagNode = _context6.sent;
                                multihash = this.chluIpfs.utils.multihashToString(dagNode.multihash);
                                // Broadcast request for pin, then wait for response
                                // TODO: handle a timeout and also rebroadcast periodically, otherwise new peers won't see the message

                                tasksToAwait = [];

                                tasksToAwait.push(new _promise2.default(function (fullfill) {
                                    _this2.chluIpfs.events.once(constants.eventTypes.pinned + '_' + multihash, function () {
                                        return fullfill();
                                    });
                                    _this2.chluIpfs.room.broadcast({ type: constants.eventTypes.wroteReviewRecord, multihash: multihash });
                                }));
                                if (previousVersionMultihash) {
                                    // This is a review update
                                    tasksToAwait.push(this.setForwardPointerForReviewRecord(previousVersionMultihash, multihash));
                                }
                                _context6.next = 13;
                                return _promise2.default.all(tasksToAwait);

                            case 13:
                                return _context6.abrupt('return', multihash);

                            case 14:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function storeReviewRecord(_x12) {
                return _ref6.apply(this, arguments);
            }

            return storeReviewRecord;
        }()
    }, {
        key: 'setForwardPointerForReviewRecord',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee8(previousVersionMultihash, multihash) {
                var _this3 = this;

                return _regenerator2.default.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                this.chluIpfs.logger.debug('Setting forward pointer for ' + previousVersionMultihash + ' to ' + multihash);
                                // TODO: verify that the update is valid
                                _context8.next = 3;
                                return new _promise2.default(function () {
                                    var _ref8 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(fullfill) {
                                        var address;
                                        return _regenerator2.default.wrap(function _callee7$(_context7) {
                                            while (1) {
                                                switch (_context7.prev = _context7.next) {
                                                    case 0:
                                                        address = _this3.chluIpfs.getOrbitDBAddress();

                                                        _this3.chluIpfs.events.once(constants.eventTypes.replicated + '_' + address, function () {
                                                            return fullfill();
                                                        });
                                                        _context7.prev = 2;
                                                        _context7.next = 5;
                                                        return _this3.chluIpfs.db.set(previousVersionMultihash, multihash);

                                                    case 5:
                                                        _context7.next = 10;
                                                        break;

                                                    case 7:
                                                        _context7.prev = 7;
                                                        _context7.t0 = _context7['catch'](2);

                                                        _this3.chluIpfs.logger.error('OrbitDB Error: ' + _context7.t0.message || _context7.t0);

                                                    case 10:
                                                        _this3.chluIpfs.room.broadcastReviewUpdates();
                                                        _this3.chluIpfs.logger.debug('Waiting for remote replication');

                                                    case 12:
                                                    case 'end':
                                                        return _context7.stop();
                                                }
                                            }
                                        }, _callee7, _this3, [[2, 7]]);
                                    }));

                                    return function (_x15) {
                                        return _ref8.apply(this, arguments);
                                    };
                                }());

                            case 3:
                                this.chluIpfs.logger.debug('Done setting forward pointer, the db has been replicated remotely');
                                return _context8.abrupt('return', multihash);

                            case 5:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function setForwardPointerForReviewRecord(_x13, _x14) {
                return _ref7.apply(this, arguments);
            }

            return setForwardPointerForReviewRecord;
        }()
    }]);
    return ReviewRecords;
}();

module.exports = ReviewRecords;