'use strict';

module.exports = {
    isNode: function isNode() {
        return typeof window === 'undefined';
    }
};