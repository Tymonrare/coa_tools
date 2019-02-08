/** @format */

import { Sprite } from 'pixi.js';
import SpriteNode from './sprite_node.js';
import BasicContainer from './basic_container.js';
import { applyNodeProps } from './utils.js';

class ButtonNode extends SpriteNode {
	constructor(node, root) {
		super(node, root);

		let btn = this;

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
			setState.apply(btn, ['idle']);
		}

		btn.buttonMode = true;
		btn.interactive = true;

		btn.on('pointerup', onButtonUp)
			.on('pointerupoutside', onButtonUp)
			.on('pointerover', onButtonOver)
			.on('pointerout', onButtonOut)
			.on('pointerdown', onButtonDown);

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
	postTreeInit(treeRoot) {
		if (this.node.properties.target_tab) {
			let c = treeRoot.findInstanceByPath(this.node.properties.target_tab);
			let gr = this.scene.groups[c.group];

			//tabs hide
			let keys = Object.keys(gr);
			for (let i = 1; i < keys.length; i++) {
				gr[keys[i]].visible = false;
			}

			this.on('pointerdown', () => {
				for (var i in gr) {
					if (c != gr[i]) gr[i].visible = false;
					else gr[i].visible = true;
				}
			});
		}
	}
}
class ProgressNode extends BasicContainer {
	constructor(node, root) {
		super(node, root);

		//FIXME: положение контейнера будет по нулям, что не совсем корректно. Желательно выставлять его
		//В положение body, а положения дочерних элементов корректировать релативно
		let maskS = new PIXI.Sprite(PIXI.Texture.WHITE);
		this.maskS = maskS;

		this.addChild(maskS);

		if (node.properties.frames) {
			let ordered = ['bar', 'body'];
			for (var i in ordered) {
				let type = ordered[i];
				let fr = node.frames.find((f) => {
					return f.id == type;
				});
				if (fr) {
					let sprite = new Sprite(fr.texture);
					this.addChild(sprite);
					this.nodes[fr.id] = sprite;
					sprite.anchor.set(
						node.transform.pivot_offset[0],
						node.transform.pivot_offset[1]
					);

					if (type == 'bar') {
						sprite.mask = maskS;
					}
				}
			}
		}

		let t = node.transform;
		maskS.width = t.size[0];
		maskS.height = t.size[1];

		let ax = 0,
			ay = 0.5;
		if (node.properties.progress_anchor) {
			let anch = node.properties.progress_anchor.split(',');
			ax = parseFloat(anch[0]);
			ay = parseFloat(anch[1]);
		}
		maskS.anchor.set(ax, ay);
		maskS.position.x = -t.size[0] * t.pivot_offset[0];
		maskS.position.y = -t.size[1] * t.pivot_offset[1];
		//move to new progress anchor
		maskS.position.x += t.size[0] * ax;
		maskS.position.y += t.size[1] * ay;
	}
	setProgress(progress) {
		let t = this.node.transform;
		this.maskS.width = t.size[0] * progress;
	}
}

export { ButtonNode, ProgressNode };
