/** @format */

import * as PIXI from 'pixi.js';
import { forEachNodeInTree } from './utils.js';

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

		forEachNodeInTree(config.nodes, (node) => {
			let path = node.resource_path;

			//do not reload
			if (fileList.includes(path)) return;
			fileList.push(path);

			//add needs name, but we doesn't
			loader.add(path, basePath + path);
		});

		loader.load((loader, resources) => {
			forEachNodeInTree(config.nodes, (node) => {
				let path = node.resource_path;
				if (node.type == 'group') return;

				let texture = resources[path].texture;

				if (node.bounds) {
					let bnd = node.bounds;
					texture = new PIXI.Texture(
						texture.baseTexture,
						new PIXI.Rectangle(bnd[0], bnd[1], bnd[2], bnd[3])
					);
				}
				if (node.frames) {
					for (var i in node.frames) {
						let fr = node.frames[i];
						let bnd = fr.bounds;
						let txt = new PIXI.Texture(
							texture.baseTexture,
							new PIXI.Rectangle(bnd[0], bnd[1], bnd[2], bnd[3])
						);
						fr.texture = txt;
					}
				}

				texture.defaultAnchor.set(node.pivot_offset[0], node.pivot_offset[1]);

				node.texture = texture;
			});

			resolve(config);
		});
	});
}
