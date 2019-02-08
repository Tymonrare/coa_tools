/** @format */
import { Container, Sprite } from 'pixi.js';
import { forEachNodeInTree, sortAllNodesInTree } from '@lib/utils.js';
import NodeContainer from './node_container.js';

/**
 * @brief
 *
 * @Param config
 *
 * @Returns  container
 */
export default class extends NodeContainer {
	constructor(config) {
		//sort nodes by z index
		sortAllNodesInTree(config.nodes, (a, b) => {
			return a.transform.z - b.transform.z;
		});

		super(config);

		this.config = config;
		this.gnodes = {};

		//post-process
		forEachNodeInTree(config.nodes, (node) => {
			let child = this.findInstanceForNode(node);
			if (!child) throw new Error(`Instance for ${node.node_path} wasn't created!`);

			if (child.node.properties.global) {
				this.gnodes[child.node.name] = child;
			}

			if (child.postTreeInit) child.postTreeInit(this);
		});
	}

	setPosition(x, y) {
		this.position.set(x + this.config.scene.offset[0], y - this.config.scene.offset[1]);
	}

	findInstanceByPath(path) {
		path = path.split('.');

		let obj = this;
		for (let i in path) {
			let name = path[i];
			if (name.length == 0) break;
			if (!obj) throw new Error(`Can't find node for path ${path}`);
			let child = obj.nodes[name];

			obj = child;
		}
		return obj;
	}
	findInstanceForNode(node) {
		let obj = this.findInstanceByPath(node.node_path);

		if (node.name != node.node_path.split('.').pop()) obj = obj.nodes[node.name];

		return obj;
	}
}