/** @format */
import * as PIXI from 'pixi.js';

/**
 * @brief
 *
 * @Param config
 *
 * @Returns PIXI.container
 */
export default function(config) {
	//root container
	const root = new PIXI.Container();

	//main container with scene offset
	const container = new PIXI.Container();
	container.nodes = container.nodes || {};
	root.addChild(container);
	container.position.set(config.scene.offset[0], -config.scene.offset[1]);

	//add childs
	config.nodes.forEach((node) => {
		try {
			processByType(node, root);
		} catch (err) {
			console.error("Can't add node: ", err, node);
		}
	});

	root.nodes = container.nodes;

	return root;
}

function processByType(node, root) {
	let meta = getNodeMeta(node);

	switch (meta.type) {
		case 'btn':
			processType_btn(node, root);
			break;
		case 'progress':
			processType_progress(node, root);
			break;
		default:
			makeSpriteFromNode(node, root.children[0]);
	}
}

function processType_btn(node, root) {
	let meta = getNodeMeta(node);
	let container = root.children[0];

	let btn = container.nodes[meta.name];
	if (!btn) {
		btn = makeSpriteFromNode(node, container);
		btn.btnTextures = {
			idle: null,
			hover: null,
			click: null
		};

		btn.buttonMode = true;
		btn.interactive = true;

		btn.on('pointerdown', onButtonDown)
			.on('pointerup', onButtonUp)
			.on('pointerupoutside', onButtonUp)
			.on('pointerover', onButtonOver)
			.on('pointerout', onButtonOut);
	}

	switch (meta.subtupe) {
		case 'idle':
			btn.texture = node.texture; //always set it as default
			btn.btnTextures.idle = node.texture;
			break;
		case 'hover':
			btn.btnTextures.hover = node.texture;
			break;
		case 'click':
			btn.btnTextures.click = node.texture;
			break;
		default:
			throw new Error(
				`Button subtype ${meta.subtupe} illegal! Avaible subtypes: 'idle', 'hover', 'click'`
			);
	}

	function onButtonDown() {
		this.isdown = true;
		if (!this.btnTextures.click) {
			return;
		}
		this.texture = this.btnTextures.click;
	}

	function onButtonUp() {
		this.isdown = false;
		if (this.isOver && this.btnTextures.hover) {
			this.texture = this.btnTextures.hover;
		} else if (this.btnTextures.idle) {
			this.texture = this.btnTextures.idle;
		}
	}

	function onButtonOver() {
		this.isOver = true;
		if (this.isdown || !this.btnTextures.hover) {
			return;
		}
		this.texture = this.btnTextures.hover;
	}

	function onButtonOut() {
		this.isOver = false;
		if (this.isdown || !this.btnTextures.idle) {
			return;
		}
		this.texture = this.btnTextures.idle;
	}
}

function processType_progress(node, root) {
	let meta = getNodeMeta(node);

	let container = root.children[0];

	let bar = container.nodes[meta.name];
	if (!bar) {
		//FIXME: положение контейнера будет по нулям, что не совсем корректно. Желательно выставлять его
		//В положение body, а положения дочерних элементов корректировать релативно
		bar = new PIXI.Container();
		container.nodes[meta.name] = bar;
		container.addChild(bar);
		bar.setProgress = function(progress) {
			if(!container.bar) return;

			container.bar.scale.x = progress;

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
	}

	let sprite = makeSpriteFromNode(node, bar);

	if (meta.subtupe == 'bar') {
		container.bar = sprite;
	}
}

function getNodeMeta(node) {
	let fullName = node.name;
	let splitted = fullName.split('_');

	let meta = {
		name: undefined,
		type: undefined,
		subtupe: undefined
	};

	switch (splitted.length) {
		case 0:
			throw new Error('Node name empty!');
		case 1:
			meta.name = splitted[0];
			break;
		case 2:
			meta.name = splitted[1];
			meta.type = splitted[0];
			break;
		case 3:
			meta.name = splitted[1];
			meta.type = splitted[0];
			meta.subtupe = splitted[2];
			break;
		default:
			throw new Error('Node name incorrect pattern!');
	}

	return meta;
}

function makeSpriteFromNode(node, parent) {
	let s = new PIXI.Sprite(node.texture);
	addChildNode(node, s, parent);
	return s;
}

function addChildNode(node, child, parent) {
	child.rotation = node.rotation; //radians
	child.alpha = node.opacity;
	child.scale.set(node.scale[0], node.scale[1]);
	child.position.set(node.position[0], node.position[1]);
	child.anchor.set(node.pivot_offset[0], node.pivot_offset[1]);

	parent.nodes = parent.nodes || {};
	parent.nodes[getNodeMeta(node).name] = child;

	parent.addChild(child);
}
