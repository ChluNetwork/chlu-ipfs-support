module.exports = function (config) {
    config.set({
        browsers: [ 'Firefox' ],
        files: [
            { pattern: 'tests/*.test.js', watched: true }
        ],
        client: {
            mocha: {
                opts: 'tests/mocha.opts'
            }
        },
        phantomjsLauncher: {
            // Have phantomjs exit if a ResourceError is encountered (useful if karma exits without killing phantom)
            exitOnResourceError: true
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
            'tests/*.test.js': [ 'webpack', 'sourcemap' ]
        },
        reporters: [ 'dots' ],
        // webpack config object
        webpack: {
            devtool: 'inline-source-map',
            node: {
                // Required by js-ipfs
                fs: 'empty',
                net: 'empty',
                tls: 'empty'
            }
        },
        webpackMiddleware: {
            noInfo: true,
        }
    });
};
  