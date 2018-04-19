const { startRendezvousServer } = require('./src/utils/rendezvous');
const constants = require('./src/constants');
const webpack = require('webpack');

module.exports = function (config) {
    startRendezvousServer(constants.rendezvousPorts.test);
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
            'karma-mocha-reporter'
        ],
        // run the bundle through the webpack and sourcemap plugins
        preprocessors: {
            'tests/**/*.test.js': [ 'webpack', 'sourcemap' ]
        },
        reporters: [ 'mocha' ],
        // webpack config object
        webpack: {
            //devtool: 'cheap-module-eval-source-map',
            node: {
                // Required by js-ipfs
                fs: 'empty',
                net: 'empty',
                tls: 'empty'
            },
            plugins: [
                // do not load server code (only needed in tests, sources don't require this)
                new webpack.IgnorePlugin(/^libp2p-websocket-star-rendezvous$/)
            ]
        },
        webpackMiddleware: {
            noInfo: true,
        },
        browserNoActivityTimeout: 120000
    });
};
  