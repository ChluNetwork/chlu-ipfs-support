module.exports = function (config) {
    config.set({
        browsers: [ 'Chrome' ],
        // karma only needs to know about the test bundle
        files: [
            { pattern: 'tests/*.test.js', watched: true }
        ],
        frameworks: [ 'mocha', 'chai' ],
        plugins: [
            'karma-chrome-launcher',
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
  