const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
    entry: './src/index.js',
    output: {
        filename: 'ChluIPFS.min.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'ChluIPFS'
    },
    externals: {
        ipfs: 'Ipfs',
        'orbit-db': 'OrbitDB'
    },
    plugins: [
        new CleanWebpackPlugin(['dist']),
        new UglifyJSPlugin(),
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