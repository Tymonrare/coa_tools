/** @format */

import BasicContainer from './basic_container.js';
import SpriteNode from './sprite_node.js';
import { applyNodeProps, createMaskForNode } from './utils.js';
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

		//props

		/**
		 * @brief with false will be requestAnimationFrame each bind change instead of isntant redraws
		 */
		this._instantUpdate = false;

		//init
		this.refNode = this.children.find((c) => {
			return c.name == 'node';
		});
		console.assert(
			this.refNode,
			`Container ${this.node.node_path} hasn't child with name 'node'`
		);
		this.removeChild(this.refNode);

		this.areaNode = this.node.nodes.find((n) => {
			return n.name == 'area';
		});
		console.assert(
			this.areaNode,
			`Container ${this.node.node_path} hasn't child with name 'area'`
		);

		//add nodes
		this.contentContainer = new PIXI.Container();
		this.addChild(this.contentContainer);

		this.mask = createMaskForNode(this.areaNode);
		this.addChild(this.mask);

		//parse styles
		this.styles = {
			scroll: null
		};
		if (this.node.properties.style) {
			let styles = this.node.properties.style.split(',');

			//scroll
			let scroll = styles.find((s) => {
				return s.includes('scroll');
			});
			if (scroll) {
				scroll = scroll.split('-')[1]; //'h' or 'v'
				if (scroll != 'h' && scroll != 'v') {
					console.warn(
						`Style for node ${this.node.node_path} was set as ${
							this.node.properties.style
						}. You can use only 'scroll-h' and 'scroll-v' keywords for scroll`
					);
					scroll = null;
				}
			}

			this.styles.scroll = scroll;
		}

		//scroll buttons

		//=== {math} ===

		//elements padding
		let padding = { x: 0, y: 0 };
		if (this.refNode.node.properties.padding) {
			let p = ('' + this.refNode.node.properties.padding).split(',');
			padding.x = parseInt(p[0]);
			padding.y = parseInt(p[1] || p[0]);
		}

		this.nodeSize = {
			x: this.refNode.node.transform.size[0] + padding.x,
			y: this.refNode.node.transform.size[1] + padding.y
		};

		let self = this;
		function makeBtn(direction) {
			let btn = new PIXI.Sprite(PIXI.Texture.WHITE);
			btn.anchor.set(0.5);
			btn.scale.set(3);
			btn.interactive = true;
			btn.buttonMode = true;
			btn.direction = direction;

			btn.tint = '0xaaaaaa';
			btn.alpha = 0.5;
			btn.rotation = Math.PI/4;

			let t = self.areaNode.transform

			btn.on('pointertap', function(){
				let x = self.contentContainer.position.x - direction.x * self.nodeSize.x;
				let y = self.contentContainer.position.y - direction.y * self.nodeSize.y;

				let lastchild = self.contentContainer.children[self.contentContainer.children.length - 1];
				let lastchildSize = lastchild.node.transform.size;

				let max = {
					x: (-lastchild.position.x - padding.x*2 - lastchildSize[0] + t.size[0]) * (direction.x ? 1 : 0),
					y: (-lastchild.position.y - padding.y*2 - lastchildSize[1] + t.size[1]) * (direction.y ? 1 : 0),
				}

				self.contentContainer.position.set(
					Math.max(max.x, Math.min(0, x)),
					Math.max(max.y, Math.min(0, y))
				)
			});

			btn.position.set(t.position[0] + t.size[0]*direction.x/2, t.position[1] + t.size[1]*direction.y/2)
			return btn;
		}

		this.btnsContainer = new PIXI.Container();
		this.addChild(this.btnsContainer);

		if(this.styles.scroll == 'h'){
			this.btnsContainer.addChild(makeBtn({x:-1, y:0}))
			this.btnsContainer.addChild(makeBtn({x:1, y:0}))
		}
		else if(this.styles.scroll == 'v'){
			this.btnsContainer.addChild(makeBtn({x:0, y:-1}))
			this.btnsContainer.addChild(makeBtn({x:0, y:1}))
		}
		this.btnsContainer.visible = false;

		this.dataArray = [];
	}
	updateBinding(array) {
		//prep
		this.dataArray = array;

		if (this.updateRequested) return;
		this.updateRequested = true;

		if (!this._instantUpdate) {
			requestAnimationFrame(() => this.updateContent());
		} else {
			this.updateContent();
		}
	}
	updateContent() {
		this.updateRequested = false;
		this.contentContainer.removeChildren();

		if (!this.dataArray.length) return;

		//=== {math} ===

		//elements padding
		let padding = { x: 0, y: 0 };
		if (this.refNode.node.properties.padding) {
			let p = ('' + this.refNode.node.properties.padding).split(',');
			padding.x = parseInt(p[0]);
			padding.y = parseInt(p[1] || p[0]);
		}

		//elements positions
		let areaSize = this.areaNode.transform.size;
		this.nodeSize = {
			x: this.refNode.node.transform.size[0] + padding.x,
			y: this.refNode.node.transform.size[1] + padding.y
		};

		let dims = {
			x: Math.max(1, (areaSize[0] / this.nodeSize.x) | 0),
			y: Math.max(1, (areaSize[1] / this.nodeSize.y) | 0)
		};

		//scroll init
		if (this.styles.scroll && dims.x * dims.y < this.dataArray.length) {
			/*this.interactive = true; //I have issues with nested buttons
			this.on('pointerdown', onPointerDown)
				.on('pointermove', onPointerMove)
				.on('pointerup', onPointerUp)
				.on('pointerupoutside', onPointerUp);
				*/
			this.btnsContainer.visible = true;

		} else {
			this.btnsContainer.visible = false;
			this.interactive = false;
			/*
			this.off('pointerdown', onPointerDown)
				.off('pointermove', onPointerMove)
				.off('pointerup', onPointerUp)
				.off('pointerupoutside', onPointerUp);
				*/
		}

		//container styles
		if (this.styles.scroll) {
			//dims is maximum size of container, so with scroll it inf
			if (this.styles.scroll == 'h') {
				dims.x = Infinity;
			} else if (this.styles.scroll == 'v') {
				dims.y = Infinity;
			}
		}

		if (dims.x * dims.y < this.dataArray.length)
			console.warn(
				`Container ${this.node.node_path} not scrollable and can fit only ${dims.x *
					dims.y} elements. You trying to push ${this.dataArray.length}`
			);

		let cloneDir = dims.x < dims.y ? dims.x : dims.y;
		let nodeSize = this.nodeSize;
		function calcPosForNode(index) {
			let pos1 = (index / cloneDir) | 0;
			let pos2 = index % cloneDir;

			let x = dims.x > dims.y ? pos1 : pos2;
			let y = dims.x < dims.y ? pos1 : pos2;

			return { x: x * nodeSize.x, y: y * nodeSize.y };
		}

		//children
		let keysList = Object.keys(this.dataArray[0]);
		for (let i = 0; i < this.dataArray.length; i++) {
			let data = this.dataArray[i];
			//1. Create new node
			let newNode = this.addNodeClone(this.refNode.node);
			newNode._refData = data;
			//reassign
			this.removeChild(newNode);
			this.contentContainer.addChild(newNode);

			//2. Set position
			let pos = calcPosForNode(i);
			newNode.position.x += pos.x;
			newNode.position.y += pos.y;

			//3. find children OF NEW NODE with prop name and set value for it
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

			//4. Commit event
			if(typeof data.$elementCreated == 'function'){
				try {
					data.$elementCreated(newNode)
				}
				catch (err){
					console.error('Post init callee error: ', err)
				}
			}
		}

		//scroll
		let pointerdown = false;
		let pressPos = { x: 0, y: 0 };
		let dir = {
			x: this.styles.scroll == 'h' ? 1 : 0,
			y: this.styles.scroll == 'v' ? 1 : 0
		};
		let container = this.contentContainer;
		let initialPos;

		function onPointerDown(e) {
			pointerdown = true;
			pressPos = {
				x: e.data.global.x,
				y: e.data.global.y
			};
			initialPos = {
				x: container.position.x,
				y: container.position.y
			};
		}
		function onPointerUp(e) {
			pointerdown = false;
		}
		function onPointerMove(e) {
			if (!pointerdown) return;
			let delta = {
				x: (e.data.global.x - pressPos.x) * dir.x,
				y: (e.data.global.y - pressPos.y) * dir.y
			};

			let maxPos = calcPosForNode(this.dataArray.length);
			let minX = 0,
				minY = 0;

			container.position.set(
				//TODO: Упростить вычисления X, чота я намудрил
				dir.x *
					Math.max(
						-maxPos.x + areaSize[0] - padding.x,
						Math.min(minX, initialPos.x + delta.x)
					),
				dir.y * Math.max(-maxPos.y, Math.min(minY, initialPos.y + delta.y))
			);
		}
	}
	get dataArray(){
		return this._dataArray;
	}
	set dataArray(array){
			//array listen for changes
			let self = this;
			this._dataArray = array;
			this._bindingValue = new Proxy(this.dataArray, {
				set(obj, key, val) {
					obj[key] = val;

					self.binding = self.dataArray;

					return true;
				}
			});
	}
}
export default NodeContainer;
