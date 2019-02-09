/** @format */

import { Sprite } from 'pixi.js';

export default class extends Sprite {
	constructor(node, scene) {
		let texture = node.frames ? node.frames[0].texture : node.texture;
		super(texture);

		this.node = node;
		this.name = node.name;
		this.scene = scene;
	}

	setFrame(name) {
		if (!this.node.frames) {
			throw Error(`Node ${this.node.node_path} hasn't frames!`);
		}
		let fr = this.node.frames.find((f) => {
			return f.id == name;
		});
		if (!fr) {
			throw Error(`Node ${this.node.node_path} hasn't frame ${name}!`);
		}

		this.texture = fr.texture;
	}

	//copy of basic_class.js
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
