/** @format */
import { Container } from 'pixi.js';
import SpriteNode from './sprite_node.js';
import { applyNodeProps }  from './utils.js';
import { ButtonNode, ProgressNode } from './custom_interactive.js';

class BasicContainer extends Container{
	constructor(node) {
		super();

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

		if (node) {
			this.node = node;
			this.name = node.name;
		}

		node.nodes.forEach((n) => this.addNode(n));
	}
	addNode(node) {
		try {
			let obj;
			switch (node.type) {
				case 'frames':
				case 'sprite':
					switch (node.properties.type) {
						case 'btn':
							obj = new ButtonNode(node);
							break;
						case 'progress':
							obj = new ProgressNode(node);
							break;
						default:
							obj = new SpriteNode(node);
					}
					break;
				case 'group':
					obj = new BasicContainer(node);
					break;
			}

			this.addChild(obj);
			applyNodeProps(node, obj);

			return obj;
		} catch (err) {
			console.error("Can't add node: ", err, node);
		}
	}
	removeChild(child) {
		if (typeof child == 'string') child = this.nodes[child];

		delete this.nodes[child.name];
		super.removeChild(child);
	}
	addChild(child) {
		super.addChild(child);

		if (child.name) this.nodes[child.name] = child;
	}
}

export default BasicContainer;
