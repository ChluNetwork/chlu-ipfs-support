'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var constants = require('../constants');

var Persistence = function () {
    function Persistence(chluIpfs) {
        (0, _classCallCheck3.default)(this, Persistence);

        this.chluIpfs = chluIpfs;
    }

    (0, _createClass3.default)(Persistence, [{
        key: 'persistData',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
                var data;
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                if (!this.chluIpfs.enablePersistence) {
                                    _context.next = 24;
                                    break;
                                }

                                data = {};

                                if (!(this.chluIpfs.type === constants.types.customer)) {
                                    _context.next = 10;
                                    break;
                                }

                                // Customer OrbitDB Address
                                data.orbitDbAddress = this.chluIpfs.getOrbitDBAddress();
                                // Customer multihash of last review record created
                                data.lastReviewRecordMultihash = this.chluIpfs.lastReviewRecordMultihash;
                                // Customer keys
                                _context.next = 7;
                                return this.chluIpfs.crypto.exportKeyPair();

                            case 7:
                                data.keyPair = _context.sent;
                                _context.next = 11;
                                break;

                            case 10:
                                if (this.chluIpfs.type === constants.types.service) {
                                    // Service Node Synced OrbitDB addresses
                                    data.orbitDbAddresses = (0, _keys2.default)(this.chluIpfs.orbitDb.dbs);
                                }

                            case 11:
                                this.chluIpfs.logger.debug('Saving persisted data');
                                _context.prev = 12;
                                _context.next = 15;
                                return this.chluIpfs.storage.save(this.chluIpfs.directory, data, this.chluIpfs.type);

                            case 15:
                                _context.next = 20;
                                break;

                            case 17:
                                _context.prev = 17;
                                _context.t0 = _context['catch'](12);

                                this.chluIpfs.logger.error('Could not write data: ' + _context.t0.message || _context.t0);

                            case 20:
                                this.chluIpfs.events.emit('saved');
                                this.chluIpfs.logger.debug('Saved persisted data');
                                _context.next = 25;
                                break;

                            case 24:
                                this.chluIpfs.logger.debug('Not persisting data, persistence disabled');

                            case 25:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this, [[12, 17]]);
            }));

            function persistData() {
                return _ref.apply(this, arguments);
            }

            return persistData;
        }()
    }, {
        key: 'loadPersistedData',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2() {
                var data;
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (!this.chluIpfs.enablePersistence) {
                                    _context2.next = 21;
                                    break;
                                }

                                this.chluIpfs.logger.debug('Loading persisted data');
                                _context2.next = 4;
                                return this.chluIpfs.storage.load(this.chluIpfs.directory, this.chluIpfs.type);

                            case 4:
                                data = _context2.sent;

                                if (!(this.chluIpfs.type === constants.types.service)) {
                                    _context2.next = 9;
                                    break;
                                }

                                if (!data.orbitDbAddresses) {
                                    _context2.next = 9;
                                    break;
                                }

                                _context2.next = 9;
                                return this.chluIpfs.orbitDb.openDbs(data.orbitDbAddresses);

                            case 9:
                                if (!data.orbitDbAddress) {
                                    _context2.next = 12;
                                    break;
                                }

                                _context2.next = 12;
                                return this.chluIpfs.orbitDb.openPersonalOrbitDB(data.orbitDbAddress);

                            case 12:
                                if (data.lastReviewRecordMultihash) this.chluIpfs.lastReviewRecordMultihash = data.lastReviewRecordMultihash;

                                if (!data.keyPair) {
                                    _context2.next = 17;
                                    break;
                                }

                                _context2.next = 16;
                                return this.chluIpfs.crypto.importKeyPair(data.keyPair);

                            case 16:
                                this.chluIpfs.crypto.keyPair = _context2.sent;

                            case 17:
                                this.chluIpfs.events.emit('loaded');
                                this.chluIpfs.logger.debug('Loaded persisted data');
                                _context2.next = 22;
                                break;

                            case 21:
                                this.chluIpfs.logger.debug('Not loading persisted data, persistence disabled');

                            case 22:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function loadPersistedData() {
                return _ref2.apply(this, arguments);
            }

            return loadPersistedData;
        }()
    }]);
    return Persistence;
}();

module.exports = Persistence;