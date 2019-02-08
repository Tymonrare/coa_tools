/** @format */
import { Container } from 'pixi.js';

export default class extends Container {
	constructor(node, scene) {
		super();

		//1. It first element in scene
		//2. It another element and root will constant
		scene = scene || this;
		this.scene = scene;

		this.nodes = new Proxy(
			{},
			{
				get: (obj, prop) => {
					return obj[prop];
				},
				set: (obj, prop, val) => {
					obj[prop] = val;

					if (!this[prop]) this[prop] = val;

					return true;
				}
			}
		);

		this.node = node;
		this.name = node.name;
	}
	addNodeClone(node) {
		let name = node.name;
		node._clones = (node._clones || 0) + 1;
		let newName = name + '_clone_' + node._clones;

		let rootObj;
		forEachNodeInTree([node], (node) => {
			let obj = this.addNode(node);
			//first created node will be root
			if (!rootObj) {
				rootObj = obj;
				rootObj.name = newName;
			}
		});
		return rootObj;
	}
	removeChild(child) {
		if (typeof child == 'string') child = this.nodes[child];

		delete this.nodes[child.name];
		super.removeChild(child);
		child.destroy({ children: true });
	}
	addChild(child) {
		super.addChild(child);

		if (child.name) this.nodes[child.name] = child;
	}
}
