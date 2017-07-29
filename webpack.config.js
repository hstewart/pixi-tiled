const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// Import paths
const node_modules = path.join(__dirname, '/node_modules')
//const pixi = path.join(node_modules, '/pixi.js/dist/pixi.min.js');
//const howler = path.join(node_modules, '/howler/dist/howler.min.js');

module.exports = {
    entry: './index.js',
    output: {
        path: path.join(__dirname, 'bin'),
        filename: 'pixi-tiled.js',
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015']
                }
            },
        ]
    },
    resolve: {
        alias: {
            //'pixi': pixi,
            //'howler': howler,
            //'jquery': 'jquery/src/jquery',
        }
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'pixi-tiled (Development)',
            production: false,
            minify: {
                html5: true,
                collapseWhitespace: false
            },
            template: 'example/viewer.html'
        }),
        new webpack.DefinePlugin({
            PRODUCTION: JSON.stringify(false)
        })
    ],
    devtool: "source-map"
};
