module.exports = {
    debug(msg) {
        console.log('[DEBUG][' + timestamp() + '] ' + msg);
    },

    info(msg) {
        console.log('[INFO][' + timestamp() + '] ' + msg);
    },
    
    warn(msg) {
        console.warn('[WARNING][' + timestamp() + '] ' + msg);
    },
    
    error(msg) {
        console.error('[ERROR][' + timestamp() + '] ' + msg);
    }
};

function timestamp() {
    return (new Date()).toString();
}