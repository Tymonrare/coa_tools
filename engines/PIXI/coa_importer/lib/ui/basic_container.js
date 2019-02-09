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
	removeChild(child) {
		if (typeof child == 'string') child = this.nodes[child];

		delete this.nodes[child.name];

		//TODO:
		//delete from groups
		//delete from gnodes

		//child.destroy({ children: true });
		super.removeChild(child);
	}
	addChild(child) {
		super.addChild(child);

		if (child.name) this.nodes[child.name] = child;
	}

	//update in sprite_node too if you changing something
	updateBinding() {
		throw new Error(`${this.constructor.name} doesn't support binds`);
	}
	get binding() {
		return this._bindingValue;
	}
	set binding(value) {
		this._bindingValue = value;
		this.updateBinding(this._bindingValue);
	}
}
