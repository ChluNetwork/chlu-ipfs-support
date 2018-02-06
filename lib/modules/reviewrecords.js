'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

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

var _require = require('../utils/ipfs'),
    storeBuffer = _require.storeBuffer,
    multihashToString = _require.multihashToString;

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
                                return this.chluIpfs.orbitDb.openDbForReplication(reviewRecord.orbitDb);

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
                var dagNode, buffer;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                _context4.next = 2;
                                return this.chluIpfs.ipfs.object.get(this.chluIpfs.utils.multihashToBuffer(multihash));

                            case 2:
                                dagNode = _context4.sent;
                                buffer = dagNode.data;
                                return _context4.abrupt('return', protobuf.ReviewRecord.decode(buffer));

                            case 5:
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

                                // TODO: validate
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
        key: 'prepareReviewRecord',
        value: function prepareReviewRecord(reviewRecord) {
            // TODO: validate
            if (this.chluIpfs.type === constants.types.customer) {
                reviewRecord.orbitDb = this.chluIpfs.getOrbitDBAddress();
            } else if (!reviewRecord.orbitDb) {
                throw new Error('Can not set the orbitDb address since this is not a customer');
            }
            reviewRecord = this.setPointerToLastReviewRecord(reviewRecord);
            return protobuf.ReviewRecord.encode(reviewRecord);
        }
    }, {
        key: 'addReviewRecordToIPFS',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(buffer) {
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                _context6.next = 2;
                                return storeBuffer(this.chluIpfs.ipfs, buffer);

                            case 2:
                                return _context6.abrupt('return', _context6.sent);

                            case 3:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function addReviewRecordToIPFS(_x11) {
                return _ref6.apply(this, arguments);
            }

            return addReviewRecordToIPFS;
        }()
    }, {
        key: 'storeReviewRecord',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(reviewRecord) {
                var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
                var defaultOptions, opt, previousVersionMultihash, publish, buffer, multihash;
                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                defaultOptions = {
                                    publish: true
                                };
                                opt = (0, _assign2.default)({}, defaultOptions, options);
                                previousVersionMultihash = opt.previousVersionMultihash, publish = opt.publish;
                                buffer = this.prepareReviewRecord(reviewRecord);
                                // write thing to ipfs

                                _context7.next = 6;
                                return this.addReviewRecordToIPFS(buffer);

                            case 6:
                                multihash = _context7.sent;

                                if (!options.expectedMultihash) {
                                    _context7.next = 10;
                                    break;
                                }

                                if (!(multihashToString(options.expectedMultihash) !== multihashToString(multihash))) {
                                    _context7.next = 10;
                                    break;
                                }

                                throw new Error('Expected a different multihash');

                            case 10:
                                if (!publish) {
                                    _context7.next = 13;
                                    break;
                                }

                                _context7.next = 13;
                                return this.publishReviewRecord(multihash, previousVersionMultihash);

                            case 13:
                                return _context7.abrupt('return', multihash);

                            case 14:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function storeReviewRecord(_x13) {
                return _ref7.apply(this, arguments);
            }

            return storeReviewRecord;
        }()
    }, {
        key: 'publishReviewRecord',
        value: function () {
            var _ref8 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee8(multihash, previousVersionMultihash) {
                var tasksToAwait;
                return _regenerator2.default.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                // Broadcast request for pin, then wait for response
                                // TODO: handle a timeout and also rebroadcast periodically, otherwise new peers won't see the message
                                tasksToAwait = [this.waitForRemotePin(multihash)];

                                if (previousVersionMultihash) {
                                    // This is a review update
                                    tasksToAwait.push(this.setForwardPointerForReviewRecord(previousVersionMultihash, multihash));
                                }
                                _context8.next = 4;
                                return _promise2.default.all(tasksToAwait);

                            case 4:
                                // Store operation succeeded: set this as the last review record published
                                this.chluIpfs.lastReviewRecordMultihash = multihash;
                                _context8.next = 7;
                                return this.chluIpfs.persistence.persistData();

                            case 7:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function publishReviewRecord(_x14, _x15) {
                return _ref8.apply(this, arguments);
            }

            return publishReviewRecord;
        }()
    }, {
        key: 'waitForRemotePin',
        value: function () {
            var _ref9 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee9(multihash) {
                var _this2 = this;

                return _regenerator2.default.wrap(function _callee9$(_context9) {
                    while (1) {
                        switch (_context9.prev = _context9.next) {
                            case 0:
                                _context9.next = 2;
                                return new _promise2.default(function (fullfill) {
                                    _this2.chluIpfs.events.once(constants.eventTypes.pinned + '_' + multihash, function () {
                                        return fullfill();
                                    });
                                    _this2.chluIpfs.room.broadcast({ type: constants.eventTypes.wroteReviewRecord, multihash: multihash });
                                });

                            case 2:
                            case 'end':
                                return _context9.stop();
                        }
                    }
                }, _callee9, this);
            }));

            function waitForRemotePin(_x16) {
                return _ref9.apply(this, arguments);
            }

            return waitForRemotePin;
        }()
    }, {
        key: 'setForwardPointerForReviewRecord',
        value: function () {
            var _ref10 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee11(previousVersionMultihash, multihash) {
                var _this3 = this;

                return _regenerator2.default.wrap(function _callee11$(_context11) {
                    while (1) {
                        switch (_context11.prev = _context11.next) {
                            case 0:
                                this.chluIpfs.logger.debug('Setting forward pointer for ' + previousVersionMultihash + ' to ' + multihash);
                                // TODO: verify that the update is valid
                                _context11.next = 3;
                                return new _promise2.default(function () {
                                    var _ref11 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee10(fullfill) {
                                        var address;
                                        return _regenerator2.default.wrap(function _callee10$(_context10) {
                                            while (1) {
                                                switch (_context10.prev = _context10.next) {
                                                    case 0:
                                                        address = _this3.chluIpfs.getOrbitDBAddress();

                                                        _this3.chluIpfs.events.once(constants.eventTypes.replicated + '_' + address, function () {
                                                            return fullfill();
                                                        });
                                                        _context10.prev = 2;
                                                        _context10.next = 5;
                                                        return _this3.chluIpfs.orbitDb.db.set(previousVersionMultihash, multihash);

                                                    case 5:
                                                        _context10.next = 10;
                                                        break;

                                                    case 7:
                                                        _context10.prev = 7;
                                                        _context10.t0 = _context10['catch'](2);

                                                        _this3.chluIpfs.logger.error('OrbitDB Error: ' + _context10.t0.message || _context10.t0);

                                                    case 10:
                                                        _this3.chluIpfs.room.broadcastReviewUpdates();
                                                        _this3.chluIpfs.logger.debug('Waiting for remote replication');

                                                    case 12:
                                                    case 'end':
                                                        return _context10.stop();
                                                }
                                            }
                                        }, _callee10, _this3, [[2, 7]]);
                                    }));

                                    return function (_x19) {
                                        return _ref11.apply(this, arguments);
                                    };
                                }());

                            case 3:
                                this.chluIpfs.logger.debug('Done setting forward pointer, the db has been replicated remotely');
                                return _context11.abrupt('return', multihash);

                            case 5:
                            case 'end':
                                return _context11.stop();
                        }
                    }
                }, _callee11, this);
            }));

            function setForwardPointerForReviewRecord(_x17, _x18) {
                return _ref10.apply(this, arguments);
            }

            return setForwardPointerForReviewRecord;
        }()
    }, {
        key: 'setPointerToLastReviewRecord',
        value: function setPointerToLastReviewRecord(reviewRecord) {
            if (this.chluIpfs.lastReviewRecordMultihash) {
                reviewRecord.last_reviewrecord_multihash = this.chluIpfs.lastReviewRecordMultihash;
            }
            return reviewRecord;
        }
    }]);
    return ReviewRecords;
}();

module.exports = ReviewRecords;