/** @format */

import NodeContainer from './node_container.js';
import { createMaskForNode } from './utils.js';
import { forEachNodeInTree, deepForEach } from '@lib/utils.js';

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
		{
			this.contentContainer = new PIXI.Container();
			let index = !!this.area ? 1 : 0;
			this.addChildAt(this.contentContainer, index);

			//mask all children
			this.contentContainer.mask = createMaskForNode(this.areaNode);
			this.addChild(this.contentContainer.mask);
		}

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

		this.contentPage = 0;
		this._calcContainerDims();
		this._initScrollButtons();

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

		this._calcContainerDims(); //i don't know why i have to recalc it each time ¯\_(ツ)_/¯
		let dims = { x: this.areaCellsDims.x, y: this.areaCellsDims.y };

		//scroll init
		if (this.styles.scroll && dims.x * dims.y < this.dataArray.length) {
			this.btnsContainer.visible = true;
		} else {
			this.btnsContainer.visible = false;
			this.interactive = false;
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
			if (typeof data.$elementCreated == 'function') {
				try {
					data.$elementCreated(newNode);
				} catch (err) {
					console.error('Post init callee error: ', err);
				}
			}
		}

		//update selector
		if (this.nodes.page_select) {
			this.nodes.page_select.setLength(this.maxPages_ + 1);
		}
	}
	get dataArray() {
		return this._dataArray;
	}
	set dataArray(array) {
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
	get maxPages_() {
		let lastchild = this.contentContainer.children[this.contentContainer.children.length - 1];
		if (!lastchild) return 0;

		let dirX = this.styles.scroll == 'h';
		let t = this.areaNode.transform;
		return Math.floor(lastchild.position[dirX ? 'x' : 'y'] / t.position[!dirX * 1]);
	}
	setContentPage(page) {
		let dirX = this.styles.scroll == 'h';

		let minPages = 0;
		let maxPages = this.maxPages_;

		this.contentPage = Math.min(maxPages, Math.max(minPages, page));

		this.contentContainer.position.set(
			-this.areaCellsDims.x * this.nodeSize.x * this.contentPage * dirX,
			-this.areaCellsDims.y * this.nodeSize.y * this.contentPage * !dirX
		);
		if (this.nodes.page_select) {
			this.nodes.page_select.setSelected(this.contentPage);
		}
	}
	_initScrollButtons() {
		//scroll buttons
		let self = this;
		function makeBtn(direction) {
			var btn = new PIXI.Graphics();
			// set a fill and line style
			{
				btn.beginFill(0x0, 0.3);
				btn.lineStyle(3, 0x0, 0.5);

				let len = 20;
				let width = 30;
				btn.moveTo(len, 0);
				btn.lineTo(0, -width);
				btn.lineTo(0, width);
				btn.lineTo(len, 0);

				btn.endFill();
			}
			btn.rotation =
				Math.PI * (direction.x == -1) + //x (for horisontal scrolls) rotation
				(Math.PI / 2) * direction.y; //y rotation

			btn.interactive = true;
			btn.buttonMode = true;
			btn.direction = direction;

			addClickEvent(btn, direction);

			let t = self.areaNode.transform;
			btn.position.set(
				t.position[0] + (t.size[0] * direction.x) / 2,
				t.position[1] + (t.size[1] * direction.y) / 2
			);
			return btn;
		}
		function addClickEvent(btn, direction) {
			btn.on('pointertap', function() {
				//Only one of directions will be "true" (-1 or 1) so we only care "previos" or "next" button is
				self.setContentPage(self.contentPage + (direction.x || direction.y));
			});
		}

		this.btnsContainer = new PIXI.Container();
		this.addChild(this.btnsContainer);

		let nextBtn = this.styles.scroll == 'h' ? { x: 1, y: 0 } : { x: 0, y: 1 };
		let prevBtn = this.styles.scroll == 'h' ? { x: -1, y: 0 } : { x: 0, y: -1 };

		if (this.nodes.btn_next) {
			addClickEvent(this.nodes.btn_next, nextBtn);
		} else {
			this.btnsContainer.addChild(makeBtn(nextBtn));
		}
		if (this.nodes.btn_prev) {
			addClickEvent(this.nodes.btn_prev, prevBtn);
		} else {
			this.btnsContainer.addChild(makeBtn(prevBtn));
		}

		this.btnsContainer.visible = false;
		if (this.nodes.page_select) {
			this.nodes.page_select.setLength(this.maxPages_);
			this.nodes.page_select.on('checkselect', (index) => {
				this.setContentPage(index);
			});
		}
	}
	_calcContainerDims() {
		//elements padding
		let padding = { x: 0, y: 0 };
		if (this.refNode.node.properties.padding) {
			let p = ('' + this.refNode.node.properties.padding).split(',');
			padding.x = parseInt(p[0]);
			padding.y = parseInt(p[1] || p[0]);
		}

		//elements positions
		let areaSize = this.areaNode.transform.size;
		let nodeSize = {
			x: this.refNode.node.transform.size[0] + padding.x,
			y: this.refNode.node.transform.size[1] + padding.y
		};

		let dims = {
			x: Math.max(1, (areaSize[0] / nodeSize.x) | 0),
			y: Math.max(1, (areaSize[1] / nodeSize.y) | 0)
		};

		this.elementsPadding = padding;
		this.nodeSize = nodeSize;
		this.areaCellsDims = dims;
	}
}

export default NodeList;