/** @format */

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
	entry: './src/index.js',
	output: {
		filename: '[name].bundle.js',
		path: path.resolve(__dirname, 'dist')
	},
	resolve: {
		extensions: ['.js'],
		alias: {
			'@app': path.resolve(__dirname, './src/'),
			'@lib': path.resolve(__dirname, './lib/'),
			'@res': path.resolve(__dirname, './res/')
		}
	},
	module: {
		rules: [
			{ test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' },
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader']
			}
		]
	},
	//Dev server {
	plugins: [
		new CleanWebpackPlugin(['dist']),
		new HtmlWebpackPlugin({
			title: 'teplate'
		}),
		new CopyWebpackPlugin([{ from: './res/', to: 'res' }])
	],
	devtool: 'inline-source-map'

	//}
};
