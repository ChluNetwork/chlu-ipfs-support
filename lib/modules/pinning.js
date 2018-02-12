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
var IPFSUtils = require('../modules/ipfs');

var Pinning = function () {
    function Pinning(chluIpfs) {
        (0, _classCallCheck3.default)(this, Pinning);

        this.chluIpfs = chluIpfs;
    }

    (0, _createClass3.default)(Pinning, [{
        key: 'pin',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(multihash) {
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                IPFSUtils.validateMultihash(multihash);
                                // TODO: check that the multihash evaluates to valid Chlu data
                                // broadcast start of pin process
                                _context.next = 3;
                                return this.chluIpfs.room.broadcast({ type: constants.eventTypes.pinning, multihash: multihash });

                            case 3:
                                _context.prev = 3;

                                if (!this.chluIpfs.ipfs.pin) {
                                    _context.next = 9;
                                    break;
                                }

                                _context.next = 7;
                                return this.chluIpfs.ipfs.pin.add(multihash, { recursive: true });

                            case 7:
                                _context.next = 12;
                                break;

                            case 9:
                                // TODO: Chlu service node need to be able to pin, so we should support using go-ipfs
                                this.chluIpfs.logger.warn('This node is running an IPFS client that does not implement pinning. Falling back to just retrieving the data non recursively. This will not be supported');
                                _context.next = 12;
                                return this.chluIpfs.ipfsUtils.get(multihash);

                            case 12:
                                _context.next = 14;
                                return this.chluIpfs.room.broadcast({ type: constants.eventTypes.pinned, multihash: multihash });

                            case 14:
                                _context.next = 20;
                                break;

                            case 16:
                                _context.prev = 16;
                                _context.t0 = _context['catch'](3);

                                this.chluIpfs.logger.error('IPFS Pin Error: ' + _context.t0.message);
                                return _context.abrupt('return');

                            case 20:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this, [[3, 16]]);
            }));

            function pin(_x) {
                return _ref.apply(this, arguments);
            }

            return pin;
        }()
    }]);
    return Pinning;
}();

module.exports = Pinning;