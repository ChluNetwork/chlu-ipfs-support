module.exports = function(namespace, verbose = false){
    return {
        debug(msg) {
            if (verbose) console.log('[DEBUG][' + namespace + '] ' + msg);
        },

        info(msg) {
            if (verbose) console.log('[INFO][' + namespace + '] ' + msg);
        },
        
        warn(msg) {
            console.warn('[WARNING][' + namespace + '] ' + msg);
        },
        
        error(msg) {
            console.error('[ERROR][' + namespace + '] ' + msg);
        }
    };
};