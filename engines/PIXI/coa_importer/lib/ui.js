/** @format */
import * as PIXI from 'pixi.js';
import { forEachNodeInTree, sortAllNodesInTree } from './utils.js';

/**
 * @brief
 *
 * @Param config
 *
 * @Returns PIXI.container
 */
export default class extends PIXI.Container {
	constructor(config) {
		super();

		this.nodes = {};
		this.groups = {};

		//main container with scene offset
		this.root = new PIXI.Container();
		this.root.nodes = this.nodes;
		this.addChild(this.root);
		this.root.position.set(config.scene.offset[0], -config.scene.offset[1]);

		//sort by z index
		sortAllNodesInTree(config.nodes, (a, b) => {
			return a.z - b.z;
		});

		//add childs
		forEachNodeInTree(config.nodes, (node) => {
			try {
				this.addNode(node, this.root);
			} catch (err) {
				console.error("Can't add node: ", err, node);
			}
		});
	}

	addNode(node, root) {
		let parent = this.findParentForNode(node, root);

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
			case 'group':
				obj = parent;
				break;
		}

		obj.node = node;

		if (node.properties.node_group) {
			let gr = node.properties.node_group;
			if (!this.groups[gr]) this.groups[gr] = {};

			for(let i in this.groups[gr])
				this.groups[gr][i].visible = false;

			this.groups[gr][node.name] = obj;

			obj.group = gr;
		}
	}

	addChildNode(node, child, parent) {
		child.rotation = node.rotation; //radians
		child.alpha = node.opacity;

		child.scale.set(node.scale[0], node.scale[1]);
		child.position.set(node.position[0], node.position[1]);
		if (node.pivot_offset && child.anchor)
			child.anchor.set(node.pivot_offset[0], node.pivot_offset[1]);

		parent.nodes = parent.nodes || {};
		parent.nodes[node.name] = child;

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

			if (states.hover || states.click) {
				btn.on('pointerup', onButtonUp).on('pointerupoutside', onButtonUp);

				if (states.hover) btn.on('pointerover', onButtonOver).on('pointerout', onButtonOut);
				if (states.click) btn.on('pointerdown', onButtonDown);
			}

			btn.stateTextures = states;
			onButtonOut.apply(btn);
		}

		btn.buttonMode = true;
		btn.interactive = true;

		if (node.properties.target_tab) {
			let c = this.findContainerForPath(node.properties.target_tab, this.root);
			btn.on('pointerdown', () => {
				let gr = this.groups[c.group];
				for(var i in gr){
					if(c != gr[i])
						gr[i].visible = false;
					else 
						gr[i].visible = true;
				}
			});
		}

		return btn;

		function onButtonDown() {
			this.isdown = true;
			this.texture = this.stateTextures.click;
		}

		function onButtonUp() {
			this.isdown = false;
			if (this.isOver) {
				this.texture = this.stateTextures.hover;
			} else {
				this.texture = this.stateTextures.idle;
			}
		}

		function onButtonOver() {
			this.isOver = true;
			if (this.isdown) {
				return;
			}
			this.texture = this.stateTextures.hover;
		}

		function onButtonOut() {
			this.isOver = false;
			if (this.isdown) {
				return;
			}
			this.texture = this.stateTextures.idle;
		}
	}

	addProgressNode(node, root) {
		//FIXME: положение контейнера будет по нулям, что не совсем корректно. Желательно выставлять его
		//В положение body, а положения дочерних элементов корректировать релативно
		let bar = new PIXI.Container();
		root.nodes[node.name] = bar;
		root.addChild(bar);

		let ordered = ['bar', 'body'];
		for (var i in ordered) {
			let fr = node.frames.find((f) => {
				return f.id == ordered[i];
			});
			let sprite = new PIXI.Sprite(fr.texture);
			this.addChildNode(node, sprite, bar);
			bar.nodes[fr.id] = sprite;
		}

		bar.setProgress = function(progress) {
			bar.nodes.bar.scale.x = progress;

			/*
			//from pixi example;
			const graphics = new PIXI.Graphics();
			graphics.beginFill(0xff3300);
			graphics.drawRect(0, 0, 100, 100);
			graphics.endFill();

			const sprite = new PIXI.Sprite(texture);
			sprite.mask = graphics;
			*/
		};

		return bar;
	}
	findContainerForPath(path, root) {
		if(typeof path == 'string')
			path = [path];

		let parent = root;
		for (let i in path) {
			let name = path[i];
			if (name.length == 0) break;

			let child = parent.nodes[name];
			if (!child) {
				child = new PIXI.Container();
				child.nodes = {};

				parent.nodes = parent.nodes || {};
				parent.nodes[name] = child;

				child.name = name;

				parent.addChild(child);
			}
			parent = child;
		}

		return parent;
	}

	findParentForNode(node, root) {
		let path = node.node_path.split('.');
		return this.findContainerForPath(path, root);
	}

	makeSpriteFromNode(node, parent) {
		let s = new PIXI.Sprite(node.texture);
		this.addChildNode(node, s, parent);
		return s;
	}
}
