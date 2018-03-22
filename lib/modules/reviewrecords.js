'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

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

var _require = require('lodash'),
    cloneDeep = _require.cloneDeep;

var ReviewRecords = function () {
    function ReviewRecords(chluIpfs) {
        (0, _classCallCheck3.default)(this, ReviewRecords);

        this.chluIpfs = chluIpfs;
        var self = this;
        this.notifier = function () {
            return self.notifyReviewUpdate.apply(self, arguments);
        };
    }

    // TODO: remove this (unused)


    (0, _createClass3.default)(ReviewRecords, [{
        key: 'getLastReviewRecordUpdate',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(multihash) {
                var dbValue, updatedMultihash, path, error;
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                IPFSUtils.validateMultihash(multihash);
                                this.chluIpfs.logger.debug('Checking for review updates for ' + multihash);
                                dbValue = multihash, updatedMultihash = multihash, path = [multihash];

                            case 3:
                                if (!dbValue) {
                                    _context.next = 20;
                                    break;
                                }

                                _context.next = 6;
                                return this.chluIpfs.orbitDb.db.get(dbValue);

                            case 6:
                                dbValue = _context.sent;

                                if (!(typeof dbValue === 'string')) {
                                    _context.next = 18;
                                    break;
                                }

                                IPFSUtils.validateMultihash(dbValue);

                                if (!(path.indexOf(dbValue) < 0)) {
                                    _context.next = 15;
                                    break;
                                }

                                updatedMultihash = dbValue;
                                path.push(dbValue);
                                this.chluIpfs.logger.debug('Found forward pointer from ' + multihash + ' to ' + updatedMultihash);
                                _context.next = 18;
                                break;

                            case 15:
                                error = new Error('Recursive references detected for ' + multihash);

                                this.chluIpfs.events.emit('error', error);
                                throw error;

                            case 18:
                                _context.next = 3;
                                break;

                            case 20:
                                if (!(multihash != updatedMultihash)) {
                                    _context.next = 25;
                                    break;
                                }

                                this.chluIpfs.logger.debug(multihash + ' updates to ' + updatedMultihash);
                                return _context.abrupt('return', updatedMultihash);

                            case 25:
                                this.chluIpfs.logger.debug('no updates found for ' + multihash);

                            case 26:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function getLastReviewRecordUpdate(_x) {
                return _ref.apply(this, arguments);
            }

            return getLastReviewRecordUpdate;
        }()
    }, {
        key: 'notifyIfReviewIsUpdated',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(multihash, notifyUpdate) {
                var validate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
                var updatedMultihash, reviewRecord;
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                updatedMultihash = void 0;
                                _context2.prev = 1;
                                _context2.next = 4;
                                return this.chluIpfs.orbitDb.get(multihash);

                            case 4:
                                updatedMultihash = _context2.sent;
                                _context2.next = 11;
                                break;

                            case 7:
                                _context2.prev = 7;
                                _context2.t0 = _context2['catch'](1);

                                this.chluIpfs.logger.warn('Thrown error while checking for updates for Review Record ' + multihash + ': ' + _context2.t0.message || _context2.t0);
                                updatedMultihash = null;

                            case 11:
                                if (!(updatedMultihash && updatedMultihash !== multihash)) {
                                    _context2.next = 22;
                                    break;
                                }

                                _context2.prev = 12;
                                _context2.next = 15;
                                return this.readReviewRecord(updatedMultihash, {
                                    checkForUpdates: false,
                                    validate: validate
                                });

                            case 15:
                                reviewRecord = _context2.sent;

                                notifyUpdate(multihash, updatedMultihash, reviewRecord);
                                _context2.next = 22;
                                break;

                            case 19:
                                _context2.prev = 19;
                                _context2.t1 = _context2['catch'](12);

                                this.chluIpfs.logger.error('Review update ' + updatedMultihash + ' for ' + multihash + ' was invalid: ' + _context2.t1);

                            case 22:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this, [[1, 7], [12, 19]]);
            }));

            function notifyIfReviewIsUpdated(_x3, _x4) {
                return _ref2.apply(this, arguments);
            }

            return notifyIfReviewIsUpdated;
        }()
    }, {
        key: 'findLastReviewRecordUpdate',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(multihash, notifyUpdate) {
                var _this = this;

                var validateUpdates = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
                var notify;
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                notify = function notify() {
                                    return _this.notifyIfReviewIsUpdated(multihash, notifyUpdate, validateUpdates);
                                };

                                this.chluIpfs.events.on('replicated', notify);
                                this.chluIpfs.events.on('write', notify);

                            case 3:
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
        key: 'getHistory',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(reviewRecord) {
                var history = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
                var prev, prevReviewRecord;
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                prev = reviewRecord.previous_version_multihash;

                                if (!prev) {
                                    _context4.next = 13;
                                    break;
                                }

                                if (!(history.map(function (o) {
                                    return o.multihash;
                                }).indexOf(prev) >= 0)) {
                                    _context4.next = 4;
                                    break;
                                }

                                throw new Error('Recursive history detected');

                            case 4:
                                _context4.next = 6;
                                return this.chluIpfs.reviewRecords.getReviewRecord(prev);

                            case 6:
                                prevReviewRecord = _context4.sent;

                                history.push({
                                    multihash: prev,
                                    reviewRecord: prevReviewRecord
                                });
                                _context4.next = 10;
                                return this.getHistory(prevReviewRecord, history);

                            case 10:
                                return _context4.abrupt('return', _context4.sent);

                            case 13:
                                return _context4.abrupt('return', history);

                            case 14:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function getHistory(_x9) {
                return _ref4.apply(this, arguments);
            }

            return getHistory;
        }()
    }, {
        key: 'notifyReviewUpdate',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(multihash, updatedMultihash, reviewRecord) {
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                this.chluIpfs.events.emit('updated ReviewRecord', multihash, updatedMultihash, reviewRecord);

                            case 1:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function notifyReviewUpdate(_x10, _x11, _x12) {
                return _ref5.apply(this, arguments);
            }

            return notifyReviewUpdate;
        }()
    }, {
        key: 'getReviewRecord',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(multihash) {
                var buffer;
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                IPFSUtils.validateMultihash(multihash);
                                _context6.next = 3;
                                return this.chluIpfs.ipfsUtils.get(multihash);

                            case 3:
                                buffer = _context6.sent;
                                return _context6.abrupt('return', protobuf.ReviewRecord.decode(buffer));

                            case 5:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function getReviewRecord(_x13) {
                return _ref6.apply(this, arguments);
            }

            return getReviewRecord;
        }()
    }, {
        key: 'readReviewRecord',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(multihash) {
                var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

                var _options$checkForUpda, checkForUpdates, _options$getLatestVer, getLatestVersion, _options$validate, validate, m, reviewRecord, validateOptions;

                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                _options$checkForUpda = options.checkForUpdates, checkForUpdates = _options$checkForUpda === undefined ? false : _options$checkForUpda, _options$getLatestVer = options.getLatestVersion, getLatestVersion = _options$getLatestVer === undefined ? false : _options$getLatestVer, _options$validate = options.validate, validate = _options$validate === undefined ? true : _options$validate;
                                m = multihash;

                                if (!getLatestVersion) {
                                    _context7.next = 6;
                                    break;
                                }

                                _context7.next = 5;
                                return this.chluIpfs.orbitDb.db.get(multihash);

                            case 5:
                                m = _context7.sent;

                            case 6:
                                _context7.next = 8;
                                return this.getReviewRecord(m);

                            case 8:
                                reviewRecord = _context7.sent;

                                if (!validate) {
                                    _context7.next = 20;
                                    break;
                                }

                                validateOptions = (typeof validate === 'undefined' ? 'undefined' : (0, _typeof3.default)(validate)) === 'object' ? validate : {};
                                _context7.prev = 11;
                                _context7.next = 14;
                                return this.chluIpfs.validator.validateReviewRecord(reviewRecord, validateOptions);

                            case 14:
                                _context7.next = 20;
                                break;

                            case 16:
                                _context7.prev = 16;
                                _context7.t0 = _context7['catch'](11);

                                this.chluIpfs.events.emit('validation error', _context7.t0, m);
                                throw _context7.t0;

                            case 20:
                                if (checkForUpdates) this.findLastReviewRecordUpdate(m, this.notifier, validate);
                                this.chluIpfs.events.emit('read ReviewRecord', { reviewRecord: reviewRecord, multihash: m });
                                return _context7.abrupt('return', reviewRecord);

                            case 23:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this, [[11, 16]]);
            }));

            function readReviewRecord(_x15) {
                return _ref7.apply(this, arguments);
            }

            return readReviewRecord;
        }()
    }, {
        key: 'prepareReviewRecord',
        value: function () {
            var _ref8 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee8(reviewRecord) {
                var validate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
                var keyPair;
                return _regenerator2.default.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                keyPair = this.chluIpfs.crypto.keyPair;
                                _context8.next = 3;
                                return this.chluIpfs.crypto.storePublicKey(keyPair.getPublicKeyBuffer());

                            case 3:
                                _context8.t0 = _context8.sent;
                                reviewRecord.key_location = '/ipfs/' + _context8.t0;

                                reviewRecord = this.setPointerToLastReviewRecord(reviewRecord);
                                // Remove hash in case it's wrong (or this is an update). It's going to be calculated by the signing function
                                reviewRecord.hash = '';
                                _context8.next = 9;
                                return this.chluIpfs.crypto.signReviewRecord(reviewRecord, keyPair);

                            case 9:
                                reviewRecord = _context8.sent;

                                if (!validate) {
                                    _context8.next = 13;
                                    break;
                                }

                                _context8.next = 13;
                                return this.chluIpfs.validator.validateReviewRecord(reviewRecord);

                            case 13:
                                return _context8.abrupt('return', reviewRecord);

                            case 14:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function prepareReviewRecord(_x17) {
                return _ref8.apply(this, arguments);
            }

            return prepareReviewRecord;
        }()
    }, {
        key: 'storeReviewRecord',
        value: function () {
            var _ref9 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee9(reviewRecord) {
                var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

                var previousVersionMultihash, _options$publish, publish, _options$validate2, validate, rr, buffer, dagNode, multihash;

                return _regenerator2.default.wrap(function _callee9$(_context9) {
                    while (1) {
                        switch (_context9.prev = _context9.next) {
                            case 0:
                                previousVersionMultihash = options.previousVersionMultihash, _options$publish = options.publish, publish = _options$publish === undefined ? true : _options$publish, _options$validate2 = options.validate, validate = _options$validate2 === undefined ? true : _options$validate2;
                                rr = (0, _assign2.default)({}, reviewRecord, {
                                    previous_version_multihash: previousVersionMultihash || ''
                                });

                                this.chluIpfs.logger.debug('Preparing review record');
                                _context9.next = 5;
                                return this.prepareReviewRecord(rr, validate);

                            case 5:
                                rr = _context9.sent;

                                this.chluIpfs.logger.debug('Encoding (protobuf) review record');
                                buffer = protobuf.ReviewRecord.encode(rr);

                                this.chluIpfs.logger.debug('Encoding (dagnode) review record');
                                _context9.next = 11;
                                return this.chluIpfs.ipfsUtils.createDAGNode(buffer);

                            case 11:
                                dagNode = _context9.sent;
                                // don't store to IPFS yet
                                this.chluIpfs.logger.debug('Calculating review record multihash');
                                multihash = IPFSUtils.getDAGNodeMultihash(dagNode);

                                if (!options.expectedMultihash) {
                                    _context9.next = 17;
                                    break;
                                }

                                if (!(options.expectedMultihash !== multihash)) {
                                    _context9.next = 17;
                                    break;
                                }

                                throw new Error('Expected a different multihash');

                            case 17:
                                this.chluIpfs.events.emit('stored ReviewRecord', { multihash: multihash, reviewRecord: rr });

                                if (!publish) {
                                    _context9.next = 21;
                                    break;
                                }

                                _context9.next = 21;
                                return this.publishReviewRecord(dagNode, previousVersionMultihash, multihash, rr);

                            case 21:
                                return _context9.abrupt('return', multihash);

                            case 22:
                            case 'end':
                                return _context9.stop();
                        }
                    }
                }, _callee9, this);
            }));

            function storeReviewRecord(_x19) {
                return _ref9.apply(this, arguments);
            }

            return storeReviewRecord;
        }()
    }, {
        key: 'publishReviewRecord',
        value: function () {
            var _ref10 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee10(dagNode, previousVersionMultihash, expectedMultihash, reviewRecord) {
                var multihash, tasksToAwait;
                return _regenerator2.default.wrap(function _callee10$(_context10) {
                    while (1) {
                        switch (_context10.prev = _context10.next) {
                            case 0:
                                this.chluIpfs.logger.debug('Storing review record in IPFS');
                                // Broadcast request for pin, then wait for response
                                // TODO: handle a timeout and also rebroadcast periodically, otherwise new peers won't see the message
                                _context10.next = 3;
                                return this.chluIpfs.ipfsUtils.storeDAGNode(dagNode);

                            case 3:
                                multihash = _context10.sent;

                                if (!(expectedMultihash && multihash !== expectedMultihash)) {
                                    _context10.next = 6;
                                    break;
                                }

                                throw new Error('Multihash mismatch when publishing');

                            case 6:
                                this.chluIpfs.logger.debug('Stored review record ' + multihash + ' in IPFS');
                                // Wait for it to be remotely pinned
                                tasksToAwait = [this.waitForRemotePin(multihash)];

                                if (previousVersionMultihash) {
                                    // This is a review update
                                    tasksToAwait.push(this.setForwardPointerForReviewRecord(previousVersionMultihash, multihash, reviewRecord));
                                } else {
                                    tasksToAwait.push(this.setReferenceForReviewRecord(multihash));
                                }
                                this.chluIpfs.logger.debug('Waiting for Publish tasks to complete for ' + multihash);
                                _context10.next = 12;
                                return _promise2.default.all(tasksToAwait);

                            case 12:
                                // Operation succeeded: set this as the last review record published
                                this.chluIpfs.logger.debug('Publish of ' + multihash + ' succeded: executing post-publish tasks');
                                this.chluIpfs.lastReviewRecordMultihash = multihash;
                                _context10.next = 16;
                                return this.chluIpfs.persistence.persistData();

                            case 16:
                                this.chluIpfs.events.emit('published ReviewRecord', multihash);
                                if (previousVersionMultihash) {
                                    this.notifyReviewUpdate(previousVersionMultihash, multihash, reviewRecord);
                                }
                                this.chluIpfs.logger.debug('Publish of ' + multihash + ' succeded: post-publish tasks executed');

                            case 19:
                            case 'end':
                                return _context10.stop();
                        }
                    }
                }, _callee10, this);
            }));

            function publishReviewRecord(_x20, _x21, _x22, _x23) {
                return _ref10.apply(this, arguments);
            }

            return publishReviewRecord;
        }()
    }, {
        key: 'waitForRemotePin',
        value: function () {
            var _ref11 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee11(multihash) {
                return _regenerator2.default.wrap(function _callee11$(_context11) {
                    while (1) {
                        switch (_context11.prev = _context11.next) {
                            case 0:
                                _context11.next = 2;
                                return this.chluIpfs.room.broadcastUntil({
                                    type: constants.eventTypes.wroteReviewRecord,
                                    multihash: multihash
                                }, constants.eventTypes.pinned + '_' + multihash);

                            case 2:
                            case 'end':
                                return _context11.stop();
                        }
                    }
                }, _callee11, this);
            }));

            function waitForRemotePin(_x24) {
                return _ref11.apply(this, arguments);
            }

            return waitForRemotePin;
        }()
    }, {
        key: 'setReferenceForReviewRecord',
        value: function () {
            var _ref12 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee12(multihash) {
                return _regenerator2.default.wrap(function _callee12$(_context12) {
                    while (1) {
                        switch (_context12.prev = _context12.next) {
                            case 0:
                                this.chluIpfs.logger.debug('Setting OrbitDB reference to ' + multihash);
                                _context12.prev = 1;
                                _context12.next = 4;
                                return this.chluIpfs.orbitDb.setAndWaitForReplication(multihash);

                            case 4:
                                _context12.next = 9;
                                break;

                            case 6:
                                _context12.prev = 6;
                                _context12.t0 = _context12['catch'](1);

                                this.chluIpfs.logger.error('OrbitDB Error: ' + _context12.t0.message || _context12.t0);

                            case 9:
                                this.chluIpfs.logger.debug('Done setting reference, the db has been replicated remotely');
                                return _context12.abrupt('return', multihash);

                            case 11:
                            case 'end':
                                return _context12.stop();
                        }
                    }
                }, _callee12, this, [[1, 6]]);
            }));

            function setReferenceForReviewRecord(_x25) {
                return _ref12.apply(this, arguments);
            }

            return setReferenceForReviewRecord;
        }()
    }, {
        key: 'setForwardPointerForReviewRecord',
        value: function () {
            var _ref13 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee13(previousVersionMultihash, multihash, reviewRecord) {
                return _regenerator2.default.wrap(function _callee13$(_context13) {
                    while (1) {
                        switch (_context13.prev = _context13.next) {
                            case 0:
                                this.chluIpfs.logger.debug('Setting forward pointer for ' + previousVersionMultihash + ' to ' + multihash);
                                _context13.prev = 1;
                                _context13.next = 4;
                                return this.chluIpfs.orbitDb.setAndWaitForReplication(multihash, previousVersionMultihash);

                            case 4:
                                _context13.next = 9;
                                break;

                            case 6:
                                _context13.prev = 6;
                                _context13.t0 = _context13['catch'](1);

                                this.chluIpfs.logger.error('OrbitDB Error: ' + _context13.t0.message || _context13.t0);

                            case 9:
                                this.chluIpfs.logger.debug('Done setting forward pointer, the db has been replicated remotely');
                                this.chluIpfs.events.emit('updated ReviewRecord', previousVersionMultihash, multihash, reviewRecord);
                                return _context13.abrupt('return', multihash);

                            case 12:
                            case 'end':
                                return _context13.stop();
                        }
                    }
                }, _callee13, this, [[1, 6]]);
            }));

            function setForwardPointerForReviewRecord(_x26, _x27, _x28) {
                return _ref13.apply(this, arguments);
            }

            return setForwardPointerForReviewRecord;
        }()
    }, {
        key: 'hashObject',
        value: function () {
            var _ref14 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee14(object, encoder) {
                var obj, name, _multihash, decoded, toHash, multihash;

                return _regenerator2.default.wrap(function _callee14$(_context14) {
                    while (1) {
                        switch (_context14.prev = _context14.next) {
                            case 0:
                                obj = cloneDeep(object);
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
                                if (typeof obj.signature !== 'undefined') {
                                    // Signature is applied after hashing, so remove it for hashing
                                    obj.signature = '';
                                }
                                this.chluIpfs.logger.debug('Preparing to hash the object: ' + (0, _stringify2.default)(obj));
                                toHash = encoder(obj);
                                _context14.next = 9;
                                return new _promise2.default(function (resolve, reject) {
                                    multihashing(toHash, name, function (err, multihash) {
                                        if (err) reject(err);else resolve(multihash);
                                    });
                                });

                            case 9:
                                multihash = _context14.sent;

                                obj.hash = multihashes.toB58String(multihash);
                                if (typeof object.signature !== 'undefined') {
                                    // Restore signature if it was present originally
                                    obj.signature = object.signature;
                                }
                                this.chluIpfs.logger.debug('Hashed to ' + obj.hash + ' the object ' + (0, _stringify2.default)(obj));
                                return _context14.abrupt('return', obj);

                            case 14:
                            case 'end':
                                return _context14.stop();
                        }
                    }
                }, _callee14, this);
            }));

            function hashObject(_x29, _x30) {
                return _ref14.apply(this, arguments);
            }

            return hashObject;
        }()
    }, {
        key: 'hashReviewRecord',
        value: function () {
            var _ref15 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee15(reviewRecord) {
                return _regenerator2.default.wrap(function _callee15$(_context15) {
                    while (1) {
                        switch (_context15.prev = _context15.next) {
                            case 0:
                                // TODO: better checks
                                if (!reviewRecord.last_reviewrecord_multihash) reviewRecord.last_reviewrecord_multihash = '';
                                if (!reviewRecord.previous_version_multihash) reviewRecord.previous_version_multihash = '';
                                _context15.next = 4;
                                return this.hashObject(reviewRecord, protobuf.ReviewRecord.encode);

                            case 4:
                                return _context15.abrupt('return', _context15.sent);

                            case 5:
                            case 'end':
                                return _context15.stop();
                        }
                    }
                }, _callee15, this);
            }));

            function hashReviewRecord(_x31) {
                return _ref15.apply(this, arguments);
            }

            return hashReviewRecord;
        }()
    }, {
        key: 'hashPoPR',
        value: function () {
            var _ref16 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee16(popr) {
                return _regenerator2.default.wrap(function _callee16$(_context16) {
                    while (1) {
                        switch (_context16.prev = _context16.next) {
                            case 0:
                                _context16.next = 2;
                                return this.hashObject(popr, protobuf.PoPR.encode);

                            case 2:
                                return _context16.abrupt('return', _context16.sent);

                            case 3:
                            case 'end':
                                return _context16.stop();
                        }
                    }
                }, _callee16, this);
            }));

            function hashPoPR(_x32) {
                return _ref16.apply(this, arguments);
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