/** @format */

import BasicContainer from './basic_container.js';
import SpriteNode from './sprite_node.js';
import { applyNodeProps } from './utils.js';
import { forEachNodeInTree, deepForEach } from '@lib/utils.js';
import { ButtonNode, ProgressNode, TextNode, DynamicSpriteNode } from './custom_interactive.js';

class NodeContainer extends BasicContainer {
	constructor(node, root) {
		super(node, root);

		node.nodes.forEach((n) => this.addNode(n));
	}
	addNode(node) {
		try {
			if (node.properties.ignore) return;

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
						case 'text_area':
							obj = new TextNode(node, this.scene);
							break;
						case 'sprite_area':
							obj = new DynamicSpriteNode(node, this.scene);
							break;
						default:
							obj = new SpriteNode(node, this.scene);
					}
					break;
				case 'group':
					switch (node.properties.type) {
						case 'container':
							obj = new NodeList(node, this.scene);
							break;
						default:
							obj = new NodeContainer(node, this.scene);
							break;
					}
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
	addNodeClone(node) {
		let name = node.name;
		node._clones = (node._clones || 0) + 1;
		let newName = name + '_clone_' + node._clones;

		//it isn't requsrive so should be fast enough
		let newNode = Object.assign({}, node);
		newNode.name = newName;

		let obj = this.addNode(newNode);

		return obj;
	}
}

class NodeList extends NodeContainer {
	constructor(node, root) {
		super(node, root);

		//init
		this.refNode = this.children.find((c) => {
			return c.name == 'node';
		});
		console.assert(this.refNode, "Container hasn't child with name 'node'");
		this.removeChild(this.refNode);

		this.areaNode = this.children.find((c) => {
			return c.name == 'area';
		});
		console.assert(this.refNode, "Container hasn't child with name 'area'");

		this.updateBinding([]);
	}
	updateBinding(array) {
		//prep
		this.dataArray = array;
		this.children.forEach((c) => {
			if (c.name == 'area') return;

			this.removeChild(c);
		});

		if (!this.dataArray.length) return;

		//=== {math} ===
		
		return;

		//elements padding
		let padding = { x: 0, y: 0 };
		if (this.refNode.node.properties.padding) {
			let p = ('' + this.refNode.node.properties.padding).split(',');
			padding.x = parseInt(p[0]);
			padding.y = parseInt(p[1] || p[0]);
		}

		//elements positions
		let areaSize = this.areaNode.node.transform.size;
		let refSize = this.refNode.node.transform.size;

		let dims = {
			x: Math.max(1, (areaSize[0] / (refSize[0] + padding.x)) | 0),
			y: Math.max(1, (areaSize[1] / (refSize[1] + padding.y)) | 0)
		};

		//container styles
		if (this.node.properties.style) {
			let styles = this.node.properties.style.split(',');

			//scroll
			let scrollStyle = styles.find((s) => {
				return s.includes('scroll');
			});
			if (scrollStyle) {
				scrollStyle = scrollStyle.split('-')[1]; //'h' or 'v'
				if (scrollStyle != 'h' && scrollStyle != 'v') {
					console.warn(
						`Style for node ${this.node.node_path} was set as ${
							this.node.properties.style
						}. You can use only 'scroll-h' and 'scroll-v' keywords for scroll`
					);
					scrollStyle = null;
				}
				console.log(scrollStyle);
			}
		}

		//childrens
		let keysList = Object.keys(this.dataArray[0]);
		this.dataArray.forEach((data) => {
			//1. Create new node
			let newNode = this.addNodeClone(this.refNode.node);

			//2. find children OF NEW NODE with prop name and set value for it
			deepForEach(
				newNode.children,
				(c) => {
					if (keysList.indexOf(c.name) == -1) return;

					try {
						c.updateBinding(data[c.name]);
					} catch (err) {
						console.error(`Can't set value for ${c.name}: `, err);
					}

					return false; //breaks cycle
				},
				'children'
			);
		});
	}
}
export default NodeContainer;
