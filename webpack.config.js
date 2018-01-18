const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
    entry: './src/index.js',
    output: {
        filename: 'ChluIPFS.min.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'ChluIPFS',
        libraryTarget: 'umd'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['babel-preset-env', {
                                targets: {
                                    browsers: ['last 2 versions', 'safari >= 7'],
                                    node: '6'
                                }
                            }]
                        ],
                        plugins: [
                            ['transform-runtime', {
                                'polyfill': false,
                                'regenerator': true
                            }]
                        ]
                    }
                }
            }
        ]
    }, 
    plugins: [
        new CleanWebpackPlugin(['dist']),
        new UglifyJSPlugin({
            uglifyOptions: {
                ecma: 5
            }
        }),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production')
        })
    ],
    node: {
        // Required by js-ipfs
        fs: 'empty',
        net: 'empty',
        tls: 'empty'
    }
};