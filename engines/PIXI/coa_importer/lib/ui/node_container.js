/** @format */

import BasicContainer from './basic_container.js';
import SpriteNode from './sprite_node.js';
import { applyNodeProps } from './utils.js';
import { ButtonNode, ProgressNode } from './custom_interactive.js';

class NodeContainer extends BasicContainer {
	constructor(node, root) {
		super(node, root);

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
							obj = new ButtonNode(node, this.scene);
							break;
						case 'progress':
							obj = new ProgressNode(node, this.scene);
							break;
						default:
							obj = new SpriteNode(node, this.scene);
					}
					break;
				case 'group':
					obj = new NodeContainer(node, this.scene);
					break;
			}

			if (this.nodes[obj.name])
				throw new Error(`Node with name ${obj.name} already exists!`, this);

			this.addChild(obj);
			applyNodeProps(node, obj);

			return obj;
		} catch (err) {
			console.error("Can't add node: ", err, node);
		}
	}
}
export default NodeContainer;
