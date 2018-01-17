'use strict';

module.exports = {
    debug: function debug(msg) {
        console.log('[DEBUG] ' + msg);
    },
    info: function info(msg) {
        console.log('[INFO] ' + msg);
    },
    warn: function warn(msg) {
        console.warn('[WARNING] ' + msg);
    },
    error: function error(msg) {
        console.error('[ERROR] ' + msg);
    }
};