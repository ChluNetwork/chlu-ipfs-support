'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var load = function () {
    var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
        var directory = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getDefaultDirectory();
        var type = arguments[1];
        var file, string;
        return _regenerator2.default.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        if (!env.isNode()) {
                            _context.next = 9;
                            break;
                        }

                        file = path.join(directory, type + '.json');

                        if (fs.existsSync(file)) {
                            _context.next = 4;
                            break;
                        }

                        return _context.abrupt('return', {});

                    case 4:
                        _context.next = 6;
                        return new _promise2.default(function (fullfill, reject) {
                            fs.readFile(path.join(directory, type + '.json'), function (err, result) {
                                if (err) reject(err);
                                try {
                                    var data = JSON.parse(result.toString());
                                    fullfill(data);
                                } catch (err) {
                                    reject(err);
                                }
                            });
                        });

                    case 6:
                        return _context.abrupt('return', _context.sent);

                    case 9:
                        string = localStorage.getItem('chlu-' + type + '-data') || '{}';
                        return _context.abrupt('return', JSON.parse(string));

                    case 11:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function load() {
        return _ref.apply(this, arguments);
    };
}();

var save = function () {
    var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2() {
        var directory = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getDefaultDirectory();
        var data = arguments[1];
        var type = arguments[2];
        var string, file;
        return _regenerator2.default.wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        string = (0, _stringify2.default)(data);

                        if (!env.isNode()) {
                            _context2.next = 8;
                            break;
                        }

                        if (!fs.existsSync(directory)) fs.mkdirSync(directory);
                        file = path.join(directory, type + '.json');
                        _context2.next = 6;
                        return new _promise2.default(function (fullfill, reject) {
                            fs.writeFile(file, string, function (err) {
                                return err ? reject(err) : fullfill();
                            });
                        });

                    case 6:
                        _context2.next = 9;
                        break;

                    case 8:
                        localStorage.setItem('chlu-' + type + '-data', string);

                    case 9:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, _callee2, this);
    }));

    return function save() {
        return _ref2.apply(this, arguments);
    };
}();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var path = require('path');
var fs = require('fs');
var env = require('./env');

function getDefaultDirectory() {
    if (env.isNode()) {
        return path.join(process.env.HOME || '.', '.chlu');
    } else {
        return '';
    }
}

module.exports = { save: save, load: load, getDefaultDirectory: getDefaultDirectory };