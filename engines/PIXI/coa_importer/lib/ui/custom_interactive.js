/** @format */

import { Sprite, Text } from 'pixi.js';
import SpriteNode from './sprite_node.js';
import BasicContainer from './basic_container.js';
import { applyNodeProps } from './utils.js';

class TextNode extends BasicContainer {
	constructor(node, root) {
		super(node, root);

		var defProps = new PIXI.TextStyle({
			fontFamily: 'Arial',
			fontSize: 27,
			fontStyle: 'bold',
			fontWeight: 'normal',
			fill: ['#ffffff'], // gradient
			stroke: '#000000',
			strokeThickness: 3,
			align: 'center'
		});

		//for (let key in props) defProps[key] = props[key];
		let style = new PIXI.TextStyle(defProps);

		let txt = new Text(node.name, style);
		txt.anchor.set(0.5);
		this.addChild(txt);
		this.text = txt;
	}
	updateBinding(text) {
		this.text.text = text;
	}
}

class DynamicSpriteNode extends BasicContainer {
	constructor(node, root) {
		super(node, root);

		this.sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
		this.sprite.anchor.set(node.transform.pivot_offset[0], node.transform.pivot_offset[1]);
		this.addChild(this.sprite);
	}
	updateBinding(texture) {
		this.sprite.texture = texture;

		let s = this.node.transform.size;
		if (this.node.properties.style.indexOf('fit') >= 0) {
			this.sprite.width = s[0];
			this.sprite.height = s[1];
		} else if (this.node.properties.style.indexOf('save_ratio') >= 0) {
			let w = texture.orig.width;
			let h = texture.orig.height;

			let dw = w / s[0];
			let dh = h / s[1];

			let scale;
			if (dh < dw) scale = dh;
			else scale = dw;

			this.sprite.width = w * scale;
			this.sprite.height = h * scale;
		}
	}
}

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
	updateBinding(handler) {
		if (this.clickHandler) this.off('pointerdown', this.clickHandler);

		this.clickHandler = handler;
		this.on('pointerdown', this.clickHandler);
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

		this.progress = 1;

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
	updateBinding(progress) {
		this.setProgress(progress);
	}

	//deprecated
	setProgress(progress) {
		let t = this.node.transform;
		this.maskS.width = t.size[0] * progress;
		this.progress = progress;
	}
}

export { ButtonNode, ProgressNode, TextNode, DynamicSpriteNode };
