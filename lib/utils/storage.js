'use strict';

var load = function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
        var directory = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getDefaultDirectory();
        var type = arguments[1];
        var file, string;
        return regeneratorRuntime.wrap(function _callee$(_context) {
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
                        return new Promise(function (fullfill, reject) {
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
    var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
        var directory = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getDefaultDirectory();
        var data = arguments[1];
        var type = arguments[2];
        var string, file;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        string = JSON.stringify(data);

                        if (!env.isNode()) {
                            _context2.next = 8;
                            break;
                        }

                        if (!fs.existsSync(directory)) fs.mkdirSync(directory);
                        file = path.join(directory, type + '.json');
                        _context2.next = 6;
                        return new Promise(function (fullfill, reject) {
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

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var path = require('path');
var fs = require('fs');
var env = require('./env');

function getDefaultDirectory() {
    return path.join(process.env.HOME || '.', '.chlu');
}

module.exports = { save: save, load: load, getDefaultDirectory: getDefaultDirectory };