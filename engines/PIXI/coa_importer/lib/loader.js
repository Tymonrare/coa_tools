/** @format */

import * as PIXI from 'pixi.js';

/**
 * 	* @brief
 *
 * 	* @Param config json with COA config
 *
 * 	* @Returns Promise
 *
 * @format
 */

export default function(basePath, config) {
	return new Promise((resolve) => {
		//v5:
		//const loader = new PIXI.Loader();
		//v4
		const loader = PIXI.loader;

		const fileList = [];
		config.nodes.forEach((node) => {
			let path = node.resource_path;

			//do not reload
			if (fileList.includes(path)) return;
			fileList.push(path);

			//add needs name, but we doesn't
			loader.add(path, basePath + path);
		});

		loader.load((loader, resources) => {
			config.nodes.forEach((node) => {
				let path = node.resource_path;
				let texture = resources[path].texture;

				let bnd = node.bounds;
				let txt = new PIXI.Texture(
					texture.baseTexture,
					new PIXI.Rectangle(bnd[0], bnd[1], bnd[2], bnd[3])
				);

				txt.defaultAnchor.set(node.pivot_offset[0], node.pivot_offset[1]);

				node.texture = txt;
			});

			resolve(config);
		});
	});
}
