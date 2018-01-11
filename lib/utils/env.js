

module.exports = {
    isNode() {
        return typeof window === 'undefined';
    }
};