module.exports = {
    debug() {
        // ignore
    },

    info() {
        // ignore
    },
    
    warn(msg) {
        console.warn('[WARNING] ' + msg);
    },
    
    error(msg) {
        console.error('[ERROR] ' + msg);
    }
};