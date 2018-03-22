'use strict';

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
                                    _context.next = 20;
                                    break;
                                }

                                data = {};

                                if (!(this.chluIpfs.type === constants.types.customer)) {
                                    _context.next = 7;
                                    break;
                                }

                                // Customer multihash of last review record created
                                data.lastReviewRecordMultihash = this.chluIpfs.lastReviewRecordMultihash;
                                // Customer keys
                                _context.next = 6;
                                return this.chluIpfs.crypto.exportKeyPair();

                            case 6:
                                data.keyPair = _context.sent;

                            case 7:
                                this.chluIpfs.logger.debug('Saving persisted data');
                                _context.prev = 8;
                                _context.next = 11;
                                return this.chluIpfs.storage.save(this.chluIpfs.directory, data, this.chluIpfs.type);

                            case 11:
                                _context.next = 16;
                                break;

                            case 13:
                                _context.prev = 13;
                                _context.t0 = _context['catch'](8);

                                this.chluIpfs.logger.error('Could not write data: ' + _context.t0.message || _context.t0);

                            case 16:
                                this.chluIpfs.events.emit('saved');
                                this.chluIpfs.logger.debug('Saved persisted data');
                                _context.next = 21;
                                break;

                            case 20:
                                this.chluIpfs.logger.debug('Not persisting data, persistence disabled');

                            case 21:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this, [[8, 13]]);
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
                                    _context2.next = 14;
                                    break;
                                }

                                this.chluIpfs.logger.debug('Loading persisted data');
                                _context2.next = 4;
                                return this.chluIpfs.storage.load(this.chluIpfs.directory, this.chluIpfs.type);

                            case 4:
                                data = _context2.sent;

                                if (data.lastReviewRecordMultihash) this.chluIpfs.lastReviewRecordMultihash = data.lastReviewRecordMultihash;

                                if (!data.keyPair) {
                                    _context2.next = 10;
                                    break;
                                }

                                _context2.next = 9;
                                return this.chluIpfs.crypto.importKeyPair(data.keyPair);

                            case 9:
                                this.chluIpfs.crypto.keyPair = _context2.sent;

                            case 10:
                                this.chluIpfs.events.emit('loaded');
                                this.chluIpfs.logger.debug('Loaded persisted data');
                                _context2.next = 15;
                                break;

                            case 14:
                                this.chluIpfs.logger.debug('Not loading persisted data, persistence disabled');

                            case 15:
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