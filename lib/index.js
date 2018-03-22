'use strict';

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

var ChluIPFSImpl = require('./ChluIPFS');
var ChluIPFSMock = require('./ChluIPFS.mock');
var constants = require('./constants');

/**
 * ChluIPFS is a library that handles the storage,
 * exchange and discovery of Chlu data using the
 * IPFS protocol. This class can be instanced to
 * provide an high level Chlu specific API
 * to interact with Chlu data.
 * 
 * Remember to call .start() after setting it up
 * 
 * @param {Object} options mandatory configuration
 * @param {string} options.type (mandatory) one of the values contained in ChluIPFS.types
 * @param {boolean} options.mock default false. If true, constructs a mock ChluIPFS
 * instance with all the exposed calls faked and no internals. These faked
 * calls always resolve, and the async ones do so after a short delay to simulate
 * real activity. Use this for testing your UI during development
 * @param {string} options.directory where to store all chlu-ipfs data, defaults to ~/.chlu
 * @param {Object} options.logger custom logger if you want to override the default. Needs
 * error, warn, info and debug methods which will be called with one string argument
 * @param {boolean} options.enablePersistance default true. If false, does not persist Chlu specific
 * data. This will not disable IPFS and OrbitDB persistence
 */

var ChluIPFS = function () {
    function ChluIPFS() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        (0, _classCallCheck3.default)(this, ChluIPFS);

        if (options.mock) {
            this.instance = new ChluIPFSMock(options);
        } else {
            this.instance = new ChluIPFSImpl(options);
        }
    }

    /**
     * Start subsystems. Call this before any ChluIPFS operations
     * but after you made any change to the internal modules or
     * configurations.
     * 
     * @returns {Promise} resolves when fully ready
     */


    (0, _createClass3.default)(ChluIPFS, [{
        key: 'start',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                _context.next = 2;
                                return this.instance.start();

                            case 2:
                                return _context.abrupt('return', _context.sent);

                            case 3:
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

        /**
         * Stop all subsystems. Use this to stop gracefully
         * before exiting from a Node.js process
         * 
         * @returns {Promise} resolves when fully stopped
         */

    }, {
        key: 'stop',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2() {
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                _context2.next = 2;
                                return this.instance.stop();

                            case 2:
                                return _context2.abrupt('return', _context2.sent);

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
        key: 'waitUntilReady',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3() {
                return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                _context3.next = 2;
                                return this.instance.waitUntilReady();

                            case 2:
                                return _context3.abrupt('return', _context3.sent);

                            case 3:
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

        /**
         * Change this node to a new ChluIPFS type. Works
         * when started or stopped.
         * 
         * @param {string} newType
         */

    }, {
        key: 'switchType',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(newType) {
                return _regenerator2.default.wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                _context4.next = 2;
                                return this.instance.switchType(newType);

                            case 2:
                                return _context4.abrupt('return', _context4.sent);

                            case 3:
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

        /**
         * Recursively Pin arbitrary multihashes. Falls back to a
         * shallow (non recursive) fetch with a warning if the underlying
         * IPFS node does not support pinning
         * 
         * @param {string} multihash
         * @returns {Promise} resolves when the pinning process has completed
         */

    }, {
        key: 'pin',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(multihash) {
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                _context5.next = 2;
                                return this.instance.pinning.pin(multihash);

                            case 2:
                                return _context5.abrupt('return', _context5.sent);

                            case 3:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function pin(_x3) {
                return _ref5.apply(this, arguments);
            }

            return pin;
        }()

        /**
         * Reads the review record at the given multihash.
         * Returns the review record decoded into a javascript object
         * 
         * The options object optionally accepts:
         * 
         * 
         * @returns {Promise} resolves to the review record
         * @param {string} multihash 
         * @param {Object} options optional additional preferences
         * @param {boolean} options.validate whether to check for validity (default true). Throws if the review record is invalid
         * @param {Function} options.checkForUpdates default false, if true will emit 'updated ReviewRecords' events when this RR is updated
         * requested review record
         */

    }, {
        key: 'readReviewRecord',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(multihash) {
                var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
                return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                _context6.next = 2;
                                return this.instance.readReviewRecord(multihash, options);

                            case 2:
                                return _context6.abrupt('return', _context6.sent);

                            case 3:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function readReviewRecord(_x5) {
                return _ref6.apply(this, arguments);
            }

            return readReviewRecord;
        }()

        /**
         * Takes a fully compiled review record except for fields that will be autofilled
         * such as the internal hash. The review record is checked for validity before
         * being written to IPFS.
         * 
         * @returns {string} multihash the multihash of the RR stored in IPFS
         * @param {Object} reviewRecord as a javascript object
         * @param {Object} options optional additional preferences
         * @param {boolean} options.validate default true, check for validity before writing. Throws if invalid
         * @param {boolean} options.publish default true, when false the RR is not shared with the Chlu network
         * and not advertised to other nodes
         * @param {string} options.previousVersionMultihash set this if you want this RR to be an update of an
         * old one previously published
         */

    }, {
        key: 'storeReviewRecord',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(reviewRecord) {
                var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
                return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                _context7.next = 2;
                                return this.instance.storeReviewRecord(reviewRecord, options);

                            case 2:
                                return _context7.abrupt('return', _context7.sent);

                            case 3:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function storeReviewRecord(_x7) {
                return _ref7.apply(this, arguments);
            }

            return storeReviewRecord;
        }()
    }, {
        key: 'exportData',
        value: function () {
            var _ref8 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee8() {
                return _regenerator2.default.wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                _context8.next = 2;
                                return this.instance.exportData();

                            case 2:
                                return _context8.abrupt('return', _context8.sent);

                            case 3:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function exportData() {
                return _ref8.apply(this, arguments);
            }

            return exportData;
        }()
    }, {
        key: 'importData',
        value: function () {
            var _ref9 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee9(exportedData) {
                return _regenerator2.default.wrap(function _callee9$(_context9) {
                    while (1) {
                        switch (_context9.prev = _context9.next) {
                            case 0:
                                _context9.next = 2;
                                return this.instance.importData(exportedData);

                            case 2:
                                return _context9.abrupt('return', _context9.sent);

                            case 3:
                            case 'end':
                                return _context9.stop();
                        }
                    }
                }, _callee9, this);
            }));

            function importData(_x8) {
                return _ref9.apply(this, arguments);
            }

            return importData;
        }()
    }]);
    return ChluIPFS;
}();

module.exports = (0, _assign2.default)(ChluIPFS, constants);