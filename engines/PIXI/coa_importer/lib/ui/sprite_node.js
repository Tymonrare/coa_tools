/** @format */

import { Sprite } from 'pixi.js';

export default class extends Sprite {
	constructor(node) {
		let texture = node.frames ? node.frames[0].texture : node.texture;
		super(texture);

		this.node = node;
		this.name = node.name;
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
}
