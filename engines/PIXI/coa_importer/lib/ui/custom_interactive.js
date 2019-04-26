/** @format */

import { Sprite, Text } from 'pixi.js';
import SpriteNode from './sprite_node.js';
import CoaText from './classes/coa_text.js';
//import NodeContainer from './node_container.js';
import BasicContainer from './basic_container.js';
import { applyNodeProps, createMaskForNode } from './utils.js';

class TextNode extends BasicContainer {
	constructor(node, root) {
		super(node, root);

		const defaultLineJoin = 'bevel';

		//style
		let defProps = {
			fontFamily: 'Arial',
			fontSize: 27,
			fontStyle: 'bold',
			fontWeight: 'normal',
			fill: '#ffffff',
			stroke: '#000000',
			strokeThickness: 3,
			align: 'center',
			lineJoin: defaultLineJoin
		};

		let props = this.scene.properties;
		if (props && props.fonts && props.fonts[node.properties.font]) {
			defProps = props.fonts[node.properties.font];
			if (!defProps.lineJoin) {
				lineJoin: defaultLineJoin;
			}
		}

		defProps.wordWrapWidth = defProps.wordWrapWidth || node.transform.size[0];

		let style = new PIXI.TextStyle(defProps);

		let txt = new CoaText(node.name, style, props.customTextSymbols);

		//anchor
		{
			let props = node.properties;
			let px = 0.5;
			let py = 0.5;
			if (props.pivot) {
				let arr = props.pivot.split(',');
				px = arr[0];
				py = arr[1] || arr[0];
			}

			let s = this.node.transform.size;
			let x = s[0] * px - this.node.transform.pivot_offset[0] * s[0];
			let y = s[1] * py - this.node.transform.pivot_offset[1] * s[1];

			txt.anchor.set(px, py);
			txt.position.set(x, y);
		}

		this.addChild(txt);
		this.coaText_ = txt;
	}
	updateBinding(text) {
		this.text = text;
	}
	set text(text) {
		this.coaText_.text = text;
	}
	get text() {
		return this.coaText_.text;
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
		let style = this.node.properties.style || 'save_ratio';
		if (style.includes('fit')) {
			if (style.includes('fit_h')) {
				this.sprite.width = s[0];
			} else if (style.includes('fit_v')) {
				this.sprite.height = s[1];
			} else {
				this.sprite.width = s[0];
				this.sprite.height = s[1];
			}
		} else if (style.includes('save_ratio')) {
			let w = texture.orig.width;
			let h = texture.orig.height;

			let dw = s[0] / w;
			let dh = s[1] / h;

			let scale;
			if (dh < dw) {
				scale = dh;
			} else {
				scale = dw;
			}

			this.sprite.width = w * scale;
			this.sprite.height = h * scale;
		}

		if (
			style.includes('left') ||
			style.includes('right') ||
			style.includes('top') ||
			style.includes('bottom')
		) {
			let px = this.node.transform.pivot_offset[0],
				py = this.node.transform.pivot_offset[1];
			if (style.includes('left')) {
				px = 0;
			} else if (style.includes('right')) {
				px = 1;
			}

			if (style.includes('top')) {
				py = 0;
			} else if (style.includes('bottom')) {
				py = 1;
			}

			let x = s[0] * px - this.node.transform.pivot_offset[0] * s[0];
			let y = s[1] * py - this.node.transform.pivot_offset[1] * s[1];

			this.sprite.anchor.set(px, py);
			this.sprite.position.set(x, y);
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
			click: null,
			disabled: null
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

		btn
			.on('pointerup', onButtonUp)
			.on('pointerupoutside', onButtonUp)
			.on('pointerover', onButtonOver)
			.on('pointerout', onButtonOut)
			.on('pointerdown', onButtonDown);

		//TODO: make separated animations logic
		let animate = this.node.properties.animation == 'simple_btn';
		let mode = this.node.properties.mode || 'simple';

		function setState(txt) {
			if (this.stateTextures && this.stateTextures[txt]) {
				this.texture = this.stateTextures[txt];
				return true;
			}

			return false;
		}

		function onButtonDown() {
			this.isdown = true;
			if (animate) {
				this.scale.set(this.scale.x - 0.2, this.scale.y - 0.2);
			}
			if (mode == 'simple') {
				setState.apply(this, ['click']);
			} else if (mode == 'switch') {
				this.toggled = !this.toggled;
				setState.apply(this, [this.toggled ? 'click' : 'idle']);
				this.emit('switchtoggle', this.toggled);
			}
		}

		function onButtonUp() {
			if (animate) {
				if (this.isdown) this.scale.set(this.scale.x + 0.2, this.scale.y + 0.2);
			}

			this.isdown = false;
			if (this.isOver && setState.apply(this, ['hover'])) {
			} else if (mode == 'simple') {
				setState.apply(this, ['idle']);
			}
		}

		function onButtonOver() {
			this.isOver = true;
			if (animate) {
				this.scale.set(this.scale.x + 0.1, this.scale.y + 0.1);
			}
			if (this.isdown) {
				return;
			}
			setState.apply(this, ['hover']);
		}

		function onButtonOut() {
			this.isOver = false;
			if (animate) {
				this.scale.set(this.scale.x - 0.1, this.scale.y - 0.1);
			}
			if (this.isdown) {
				return;
			}

			if (mode == 'simple') {
				setState.apply(this, ['idle']);
			}
		}
	}
	updateBinding(handler) {
		if (this.clickHandler) this.off('pointertap', this.clickHandler);

		this.clickHandler = handler;
		this.on('pointertap', this.clickHandler);
	}
	postTreeInit(treeRoot) {
		if (this.node.properties.target_tab) {
			let c = treeRoot.findInstanceByPath(this.node.properties.target_tab);
			if (!c) throw new Error(`Can't find target ${this.node.properties.target_tab}`);
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
	get interactive() {
		return this.interactive_;
	}
	set interactive(val) {
		this.interactive_ = val;

		let state = val ? 'idle' : 'disabled';
		if (this.stateTextures && this.stateTextures[state]) {
			this.texture = this.stateTextures[state];
		}
		if(this.label_){
			this.label_.alpha = val ? 1 : 0.5;
		}
	}
	/**
	 * @brief adds text into button
	 *
	 * @Param {String} text for button
	 */
	set label(text) {
		if (!this.label_) {
			this.label_ = new TextNode(
				{
					name: this.node.name + '_label',
					properties: this.node.properties,
					transform: this.node.transform
				},
				this.scene
			);
			this.addChild(this.label_);
		}
		this.label_.text = text;
	}
	set text(text) {
		this.label = text;
	}
	get text() {
		if (this.label_) {
			return this.label_.text;
		} else {
			return '';
		}
	}
}
class ProgressNode extends BasicContainer {
	constructor(node, root) {
		super(node, root);

		this.progress = 1;

		//FIXME: положение контейнера будет по нулям, что не совсем корректно. Желательно выставлять его
		//В положение body, а положения дочерних элементов корректировать релативно
		this.maskS = createMaskForNode(node);
		this.addChild(this.maskS);

		if (node.properties.frames) {
			for (let i in node.frames) {
				let fr = node.frames[i];
				let sprite = new Sprite(fr.texture);
				this.addChild(sprite);
				this.nodes[fr.id] = sprite;
				sprite.anchor.set(node.transform.pivot_offset[0], node.transform.pivot_offset[1]);

				if (fr.id == 'bar') {
					sprite.mask = this.maskS;
				}
			}
		}

		//mask pos
		let ax = 0,
			ay = 0.5;
		if (node.properties.progress_anchor) {
			let anch = node.properties.progress_anchor.split(',');
			ax = parseFloat(anch[0]);
			ay = parseFloat(anch[1]);
		}
		let t = node.transform;
		this.maskS.anchor.set(ax, ay);
		this.maskS.position.x = -t.size[0] * (t.pivot_offset[0] - ax);
		this.maskS.position.y = -t.size[1] * (t.pivot_offset[1] - ay);
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

class RadioGroup extends BasicContainer {
	constructor(node, root) {
		super(node, root);

		this.styles = {
			direction: 'h'
		};

		if (this.node.properties.style) {
			let styles = this.node.properties.style.split(',');

			//scroll
			let dir = styles.find((s) => {
				return s.includes('dir');
			});
			if (dir) {
				dir = dir.split('-')[1]; //'h' or 'v'
				if (dir != 'h' && dir != 'v') {
					console.warn(
						`Style for node ${this.node.node_path} was set as ${
							this.node.properties.style
						}. You can use only 'dir-h' and 'dir-v' keywords for scroll`
					);
					scroll = null;
				}
			}

			this.styles.direction = dir;
		}

		this.container_ = new PIXI.Container();
		this.addChild(this.container_);
		this.setLength(3);
	}
	setLength(len) {
		this.container_.removeChildren();

		//configure
		let size = this.node.transform.size;
		let padding = {
			x: size[0] * 0.5, //maybe it will be configarable
			y: size[1] * 0.5
		};
		let nodeSize = {
			x: size[0] + padding.x,
			y: size[1] + padding.y
		};
		let dirX = this.styles.direction == 'h';
		let self = this;

		//create
		for (let i = 0; i < len; i++) {
			let s = new SpriteNode(this.node);
			s.anchor.set(0.5);
			s.position.set(nodeSize.x * dirX * i, nodeSize.y * !dirX * i);
			this.container_.addChild(s);

			//make button
			s.index_ = i;
			s.interactive = true;
			s.buttonMode = true;
			s.on('pointertap', function() {
				self.setSelected(this.index_);
				self.emit('checkselect', this.index_);
			});
		}

		//center
		this.container_.position.set(
			((-nodeSize.x * len) / 2 + padding.x) * dirX,
			((-nodeSize.y * len) / 2 + padding.y) * !dirX
		);

		this.setSelected(0);
	}
	setSelected(point) {
		this.currentSelect = point;

		this.container_.children.forEach((ch, i) => {
			let curr = i == point;
			ch.interactive = !curr;
			ch.setFrame(curr ? 'selected' : 'disabled');
		});
	}
}

import NodeList from './node_list.js';
export { ButtonNode, ProgressNode, TextNode, DynamicSpriteNode, RadioGroup, NodeList };
