/** @format */
import { Container, Sprite } from 'pixi.js';
import { forEachNodeInTree, sortAllNodesInTree } from './utils.js';

class NodeContainer extends Container {
	constructor(node) {
		super();

		this.nodes = {};

		if (node) {
			this.node = node;
			this.name = node.name;
		}
	}
	removeChild(child) {
		if(typeof child == 'string')
			child = this.nodes[child];

		delete this.nodes[child.name];
		super.removeChild(child);
	}
	addChild(child) {
		super.addChild(child);

		if (child.name) {
			if (!this[child.name]) this[child.name] = child;

			this.nodes[child.name] = child;
		}
	}
}

/**
 * @brief
 *
 * @Param config
 *
 * @Returns  container
 */
export default class extends Container {
	constructor(config) {
		super();

		this.nodes = {};
		this.groups = {};

		//main container with scene offset
		this.root = new NodeContainer();
		this.root.nodes = this.nodes;
		this.addChild(this.root);
		this.root.position.set(config.scene.offset[0], -config.scene.offset[1]);

		//sort by z index
		sortAllNodesInTree(config.nodes, (a, b) => {
			return a.transform.z - b.transform.z;
		});

		//add childs
		forEachNodeInTree(config.nodes, (node) => {
			this.addNode(node, this.root);
		});
	}

	/**
	 * @brief copies and adds new node instance
	 *
	 * @Param node node element from config
	 */
	addNodeClone(node) {
		let name = node.name;
		node._clones = (node._clones || 0) + 1;
		let newName = name + '_clone_' + node._clones;

		let rootObj;
		forEachNodeInTree([node], (node) => {
			let obj = this.addNode(node, this.root, node.node_path.replace(name, newName));
			//first created node will be root
			if (!rootObj) {
				rootObj = obj;
				rootObj.name = newName;
			}
		});
		return rootObj;
	}

	/**
	 * @brief removes child from scene
	 *
	 * @Param child PIXI.DisplayObject instance
	 */
	removeChild(child) {
		if(child.parent){
			child.parent.removeChild(child);
		}
		child.destroy({children:true});
	}

	addNode(node, root, path) {
		try {
			if (!root) root = this.root;

			path = (path || node.node_path).split('.');
			let parent = this.findContainerForPath(path, root);

			let obj;
			switch (node.type) {
				case 'frames':
				case 'sprite':
					switch (node.properties.type) {
						case 'btn':
							obj = this.addBtnNode(node, parent);
							break;
						case 'progress':
							obj = this.addProgressNode(node, parent);
							break;
						default:
							obj = this.makeSpriteFromNode(node, parent);
					}
					break;
				case 'group':
					obj = parent;
					break;
			}

			obj.node = node;
			obj.name = node.name;

			if (node.properties.node_group) {
				let gr = node.properties.node_group;
				if (!this.groups[gr]) this.groups[gr] = {};

				for (let i in this.groups[gr]) this.groups[gr][i].visible = false;

				this.groups[gr][node.name] = obj;

				obj.group = gr;
			}

			return obj;
		} catch (err) {
			console.error("Can't add node: ", err, node);
		}
	}

	addChildNode(node, child, parent) {
		child.rotation = node.transform.rotation; //radians
		child.alpha = node.transform.opacity;

		child.scale.set(node.transform.scale[0], node.transform.scale[1]);
		child.position.set(node.transform.position[0], node.transform.position[1]);
		if (node.transform.pivot_offset && child.anchor)
			child.anchor.set(node.transform.pivot_offset[0], node.transform.pivot_offset[1]);

		child.name = node.name;

		parent.addChild(child);
	}
	addBtnNode(node, root) {
		let btn = this.makeSpriteFromNode(node, root);

		let states = {
			idle: node.texture,
			hover: null,
			click: null
		};

		if (node.frames) {
			node.frames.forEach((fr) => {
				if (states.hasOwnProperty(fr.id)) states[fr.id] = fr.texture;
			});

			btn.stateTextures = states;
			onButtonOut.apply(btn);
		}

		btn.buttonMode = true;
		btn.interactive = true;

		if (node.properties.target_tab) {
			let c = this.findContainerForPath(node.properties.target_tab, this.root);
			btn.on('pointerdown', () => {
				let gr = this.groups[c.group];
				for (var i in gr) {
					if (c != gr[i]) gr[i].visible = false;
					else gr[i].visible = true;
				}
			});
		}

		btn.on('pointerup', onButtonUp)
			.on('pointerupoutside', onButtonUp)
			.on('pointerover', onButtonOver)
			.on('pointerout', onButtonOut)
			.on('pointerdown', onButtonDown);

		return btn;

		function setState(txt) {
			if (this.stateTextures && this.stateTextures[txt]) {
				this.texture = this.stateTextures[txt];
				return true;
			}

			return false;
		}

		function onButtonDown() {
			this.isdown = true;
			this.scale.set(this.scale.x - 0.2, this.scale.y - 0.2);
			setState.apply(this, ['click']);
		}

		function onButtonUp() {
			if (this.isdown) this.scale.set(this.scale.x + 0.2, this.scale.y + 0.2);

			this.isdown = false;
			if (this.isOver) {
				setState.apply(this, ['hover']);
			} else {
				setState.apply(this, ['idle']);
			}
		}

		function onButtonOver() {
			this.isOver = true;
			this.scale.set(this.scale.x + 0.1, this.scale.y + 0.1);
			if (this.isdown) {
				return;
			}
			setState.apply(this, ['hover']);
		}

		function onButtonOut() {
			this.isOver = false;
			this.scale.set(this.scale.x - 0.1, this.scale.y - 0.1);
			if (this.isdown) {
				return;
			}
			setState.apply(this, ['idle']);
		}
	}

	addProgressNode(node, root) {
		//FIXME: положение контейнера будет по нулям, что не совсем корректно. Желательно выставлять его
		//В положение body, а положения дочерних элементов корректировать релативно
		let bar = new NodeContainer(node);
		root.addChild(bar);

		let ordered = ['bar', 'body'];
		for (var i in ordered) {
			let type = ordered[i];
			let fr = node.frames.find((f) => {
				return f.id == type;
			});
			if (fr) {
				let sprite = new Sprite(fr.texture);
				this.addChildNode(node, sprite, bar);
				bar.nodes[fr.id] = sprite;

				//align bar tu left cuse it fill scale from left to right
				if (type == 'bar') {
					sprite.anchor.set(0, 0.5);
					let t = node.transform;
					sprite.position.x = t.position[0] - t.size[0] * t.pivot_offset[0];
				}
			}
		}

		bar.setProgress = function(progress) {
			bar.nodes.bar.scale.x = progress;

			/*
			//from pixi example;
			const graphics = new  Graphics();
			graphics.beginFill(0xff3300);
			graphics.drawRect(0, 0, 100, 100);
			graphics.endFill();

			const sprite = new  Sprite(texture);
			sprite.mask = graphics;
			*/
		};

		return bar;
	}
	findContainerForPath(path, root) {
		if (typeof path == 'string') path = [path];

		let parent = root;
		for (let i in path) {
			let name = path[i];
			if (name.length == 0) break;

			let child = parent.nodes[name];
			if (!child) {
				child = new NodeContainer();
				child.name = name;

				parent.addChild(child);
			}
			parent = child;
		}

		return parent;
	}

	makeSpriteFromNode(node, parent) {
		let s = new Sprite(node.texture);
		this.addChildNode(node, s, parent);
		return s;
	}
}
