const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const env = process.env.NODE_ENV || 'production';

console.log("mode==", env);
module.exports = {
    mode: env,
    entry: './src/index.js',
    output: {
        filename: '[name].bundle.js',
        //filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: process.env.PUBLIC_URL || '/',
    },
    devServer: {
        contentBase: './dist',
        //historyApiFallback: true,
        port: 8083,
        client: {
            webSocketURL: `ws://0.0.0.0:${process.env.WS_PORT||8083}/ws`,
        },
        historyApiFallback: {
            disableDotRule: true,
            rewrites: [
                { from: /\/dev\/manifest\.json$/, to: '/manifest.json' },
                { from: /./, to: '/index.html' },
            ],
        },
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react'],
                    },
                },
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: './public/index.html',
            inject: 'body',
        }),
    ],
};
