const { startRendezvousServer } = require('./tests/utils/nodejs');
const webpack = require('webpack');

module.exports = function (config) {
    startRendezvousServer();
    config.set({
        browsers: [ 'Firefox' ],
        files: [
            { pattern: 'tests/**/*.test.js', watched: true }
        ],
        client: {
            mocha: {
                opts: 'tests/mocha.opts'
            }
        },
        frameworks: [ 'mocha', 'chai' ],
        plugins: [
            'karma-firefox-launcher',
            'karma-chai',
            'karma-mocha',
            'karma-sourcemap-loader',
            'karma-webpack',
        ],
        // run the bundle through the webpack and sourcemap plugins
        preprocessors: {
            'tests/**/*.test.js': [ 'webpack' ]
        },
        reporters: [ 'dots' ],
        // webpack config object
        webpack: {
            node: {
                // Required by js-ipfs
                fs: 'empty',
                net: 'empty',
                tls: 'empty'
            },
            plugins: [
                new webpack.IgnorePlugin(/\/nodejs(\.js)?$/)
            ]
        },
        webpackMiddleware: {
            noInfo: true,
        },
        browserNoActivityTimeout: 120000
    });
};
  