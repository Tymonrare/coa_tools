/** @format */

import { Rectangle, Texture, loader as pixiLoader } from 'pixi.js';
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
	return new Promise((resolve, reject) => {
		//v5:
		//const loader = new PIXI.Loader();
		//v4
		const loader = pixiLoader;

		forEachNodeInTree(config.nodes, (node) => {
			let path = node.resource_path;

			//if it isn't image
			if (path.indexOf('.png') < path.length - 4) return;

			//do not reload
			if (loader.resources[path]) return;

			//add needs name, but we doesn't
			loader.add(path, basePath + path);
		});

		function validateBounds(bounds, texture, node) {
			if (bounds[2] > texture.orig.width) {
				console.warn(
					`Node ${node.node_path} has ${bounds[2]}px bounds prop, but texture only ${
						texture.orig.width
					}px`
				);
				bounds[2] = texture.orig.width;
			}
			if (bounds[3] > texture.orig.height) {
				console.warn(
					`Node ${node.node_path} has ${bounds[3]}px bounds prop, but texture only ${
						texture.orig.height
					}px`
				);
				bounds[3] = texture.orig.height;
			}
		}

		loader.load((loader, resources) => {
			forEachNodeInTree(config.nodes, (node) => {
				let path = node.resource_path;
				if (node.type == 'group') return;

				let texture = resources[path].texture;

				if (node.bounds) {
					let bnd = node.bounds;
					validateBounds(bnd, texture, node);

					texture = new Texture(
						texture.baseTexture,
						new Rectangle(bnd[0], bnd[1], bnd[2], bnd[3])
					);
				}
				if (node.frames) {
					for (var i in node.frames) {
						let fr = node.frames[i];
						let bnd = fr.bounds;
						validateBounds(bnd, texture, node);

						let txt = new Texture(
							texture.baseTexture,
							new Rectangle(bnd[0], bnd[1], bnd[2], bnd[3])
						);
						fr.texture = txt;
					}
				}

				texture.defaultAnchor.set(
					node.transform.pivot_offset[0],
					node.transform.pivot_offset[1]
				);

				node.texture = texture;
			});

			resolve(config);
		});

		loader.onError.add((err) => {
			console.error('Got loader error', err);
			reject();
		});
	});
}
