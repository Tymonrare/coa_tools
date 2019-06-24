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
		console.assert(this.refNode, `Container ${this.node.node_path} hasn't child with name 'node'`);
		this.removeChild(this.refNode);

		this.areaNode = this.node.nodes.find((n) => {
			return n.name == 'area';
		});
		console.assert(this.areaNode, `Container ${this.node.node_path} hasn't child with name 'area'`);
		this.areaSize = this.areaNode.transform.size;

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
			scroll: null,
			page: {
				h: false,
				v: false
			}
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
						`Style for node ${this.node.node_path} was set as ${this.node.properties.style}. You can use only 'scroll-h' and 'scroll-v' keywords for scroll`
					);
					scroll = null;
				}
			}

			this.styles.scroll = scroll || null;

			//page
			styles.forEach((s) => {
				if (!s.includes('page')) return;

				//style may be `page-h` or `page-h-3` where number is page size
				let style = s.split('-');

				if (style[1] != 'h' && style[1] != 'v') {
					console.warn(
						`Style for node ${this.node.node_path} was set as ${this.node.properties.style}. You can use only 'page-h' and 'page-v' keywords for page`
					);
					return;
				}

				let val = parseInt(style[2]);
				if (val) {
					this.styles.page[style[1]] = val;
				} else {
					this.styles.page[style[1]] = true;
				}
			});
		}

		this.dataArray = [];

		this.contentPage = 0;
		this._initScrollButtons();
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

		if (!this.dataArray.length) {
			if (this.nodes.page_select) {
				this.nodes.page_select.setLength(0);
			}
			if (this.btn_next_) {
				this.btn_next_.interactive = false;
			}
			if (this.btn_prev_) {
				this.btn_prev_.interactive = false;
			}
			return;
		}

		this._calcContainerDims(); //i don't know why i have to recalc it each time ¯\_(ツ)_/¯

		//scroll init
		console.log(this.areaGridSize.x, this.areaGridSize.y, this.dataArray.length);
		if (this.styles.scroll && this.areaGridSize.x * this.areaGridSize.y < this.dataArray.length) {
			this.setScrollButtonsVisible_(true);
		} else {
			this.setScrollButtonsVisible_(false);
			this.interactive = false;
		}

		if (
			this.maxGridSize.x * this.maxGridSize.y < this.dataArray.length &&
			!(this.styles.page.h || this.styles.page.v)
		)
			console.warn(
				`Container ${this.node.node_path} not scrollable and can fit only ${this.maxGridSize.x *
					this.maxGridSize.y} elements. You trying to push ${this.dataArray.length}`
			);

		//children
		for (let i = 0; i < this.dataArray.length; i++) {
			let keysList = Object.keys(this.dataArray[i]);
			let data = this.dataArray[i];
			//1. Create new node
			let newNode = this.addNodeClone(this.refNode.node);
			newNode._refData = data;
			//reassign
			this.removeChild(newNode);
			this.contentContainer.addChild(newNode);

			//2. Set position
			let pos = this._calcPosForNode(i);
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
			this.nodes.page_select.setLength(this.maxPages_);
		}

		//update visual
		this.setContentPage(0);
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
		let elems = this.dataArray.length;
		if (!elems) return 0;

		let lastpos = this._calcCellForNode(elems);

		let dirX = this.styles.scroll == 'h';
		let dir = dirX ? 'x' : 'y';
		return Math.ceil(lastpos[dir] / this.areaGridSize[dir]);
	}
	setContentPage(page) {
		let dirX = this.styles.scroll == 'h';

		let minPages = 0;
		let maxPages = this.maxPages_;

		this.contentPage = Math.min(maxPages, Math.max(minPages, page));

		this.contentContainer.position.set(
			-this.areaGridSize.x * this.nodeSize.x * this.contentPage * dirX,
			-this.areaGridSize.y * this.nodeSize.y * this.contentPage * !dirX
		);

		//selecters
		if (this.nodes.page_select) {
			this.nodes.page_select.setSelected(this.contentPage);
		}
		if (this.btn_next_) {
			this.btn_next_.interactive = page < maxPages - 1;
		}
		if (this.btn_prev_) {
			this.btn_prev_.interactive = page > 0;
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
			btn.interactive = false; //disabled by default
		}

		this.btnsContainer = new PIXI.Container();
		this.addChild(this.btnsContainer);

		let nextBtn = this.styles.scroll == 'h' ? { x: 1, y: 0 } : { x: 0, y: 1 };
		let prevBtn = this.styles.scroll == 'h' ? { x: -1, y: 0 } : { x: 0, y: -1 };

		if (this.nodes.btn_next) {
			this.btn_next_ = this.nodes.btn_next;
			addClickEvent(this.nodes.btn_next, nextBtn);
		} else {
			this.btn_next_ = makeBtn(nextBtn);
			this.btnsContainer.addChild(this.btn_next_);
		}
		if (this.nodes.btn_prev) {
			this.btn_prev_ = this.nodes.btn_prev;
			addClickEvent(this.nodes.btn_prev, prevBtn);
		} else {
			this.btn_prev_ = makeBtn(prevBtn);
			this.btnsContainer.addChild(this.btn_prev_);
		}

		this.btnsContainer.visible = false;
		if (this.nodes.page_select) {
			this.nodes.page_select.setLength(this.maxPages_);
			this.nodes.page_select.on('checkselect', (index) => {
				this.setContentPage(index);
			});
		}
	}
	setScrollButtonsVisible_(visible) {
		if (this.btn_next_) {
			this.btn_next_.visible = visible;
		}
		if (this.btn_prev_) {
			this.btn_prev_.visible = visible;
		}
		if (this.btnsContainer) {
			this.btnsContainer.visible = visible;
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
		//default values
		let nodeSize = {
			x: this.refNode.node.transform.size[0] + padding.x,
			y: this.refNode.node.transform.size[1] + padding.y
		};
		//page values
		if (this.styles.page.h) {
			nodeSize.x = this.areaSize[0] / this.styles.page.h;
		}
		if (this.styles.page.v) {
			nodeSize.y = this.areaSize[1] / this.styles.page.v;
		}

		let dims = {
			x: Math.max(1, (this.areaSize[0] / nodeSize.x) | 0),
			y: Math.max(1, (this.areaSize[1] / nodeSize.y) | 0)
		};

		dims.x = this.node.properties.grid_w || dims.x;
		dims.y = this.node.properties.grid_h || dims.y;

		this.elementsPadding = padding;
		this.nodeSize = nodeSize;
		this.areaGridSize = dims;

		//container styles
		this.maxGridSize = { x: dims.x, y: dims.y };

		if (this.styles.scroll) {
			//dims is maximum size of container, so with scroll it inf
			if (this.styles.scroll == 'h') {
				this.maxGridSize.x = Infinity;
			} else if (this.styles.scroll == 'v') {
				this.maxGridSize.y = Infinity;
			}
		}
	}
	/**
	 * @brief position for node in absolute (grid) points
	 *
	 * @Param index
	 */
	_calcCellForNode(index) {
		let dims = this.maxGridSize;
		let cloneDir = dims.x < dims.y ? dims.x : dims.y;
		let pos1 = (index / cloneDir) | 0;
		let pos2 = index % cloneDir;

		let x = dims.x > dims.y ? pos1 : pos2;
		let y = dims.x < dims.y ? pos1 : pos2;

		return { x, y };
	}
	_calcPosForNode(index) {
		let pos = this._calcCellForNode(index);

		//default values
		let x = pos.x * this.nodeSize.x;
		let y = pos.y * this.nodeSize.y;

		//page strategy
		if (this.styles.page.h) {
			let pageSize = this.styles.page.h === true ? this.dataArray.length : this.styles.page.h;
			let startPivot =
				this.areaNode.transform.position[0] -
				this.areaNode.transform.pivot_offset[0] * this.areaNode.transform.size[0];
			x =
				startPivot +
				this.areaSize[0] / 2 - //base pivot (center)
				this.refNode.node.transform.position[0] - //base element position (margin)
				(0.5 - this.refNode.node.transform.pivot_offset[0]) * this.refNode.node.transform.size[0] - //element pivot for group nodes (now it centred)
				((this.areaSize[0] / pageSize) * (pageSize - 1)) / 2 + //-half of total area
				(this.areaSize[0] / pageSize) * index; //element index shift
		}
		if (this.styles.page.v) {
			let pageSize = this.styles.page.v === true ? this.dataArray.length : this.styles.page.v;
			let startPivot =
				this.areaNode.transform.position[1] -
				this.areaNode.transform.pivot_offset[1] * this.areaNode.transform.size[1];
			y =
				startPivot +
				this.areaSize[1] / 2 - //base pivot (center)
				this.refNode.node.transform.position[1] - //base element pivot (now it centred)
				((this.areaSize[1] / pageSize) * (pageSize - 1)) / 2 + //-half of total area
				(this.areaSize[1] / pageSize) * index; //element index shift
		}

		return { x, y };
	}
}

export default NodeList;
