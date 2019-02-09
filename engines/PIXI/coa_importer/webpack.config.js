/** @format */

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
	let externals = {
				"pixi.js":{
					commonjs: 'pixi.js',
	        commonjs2: 'pixi.js',
	        amd: 'pixi.js',
					root: 'PIXI'
				}
			};
	let props = {
		entry: './lib/index.js',
		output: {
			filename: 'index.js',
    	library: 'coaToolsPixi',
    	libraryTarget:'umd',
			path: path.resolve(__dirname, 'dist')
		},
		resolve: {
			extensions: ['.js'],
			alias: {
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
		],

		//}
	};

	if (argv.mode === 'development'){
		props.entry = './test/index.js';
		props.devtool = 'inline-source-map';

		props.plugins.push(new HtmlWebpackPlugin({
			title: 'teplate'
		}))
		props.plugins.push(new CopyWebpackPlugin([{ from: './res/', to: 'res' }]))
	}
	else {
		props.externals = externals;
	}

	return props;
}
