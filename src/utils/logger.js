module.exports = {
    debug(msg) {
        console.log('[DEBUG] ' + msg);
    },

    info(msg) {
        console.log('[INFO] ' + msg);
    },
    
    warn(msg) {
        console.warn('[WARNING] ' + msg);
    },
    
    error(msg) {
        console.error('[ERROR] ' + msg);
    }
};