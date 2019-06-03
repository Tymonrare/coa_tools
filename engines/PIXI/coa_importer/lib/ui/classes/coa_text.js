/** @format */

import { Sprite, Text, TextMetrics } from 'pixi.js';

function calcLineHeight(style) {
	//from TextMetrics.js::measureText
	return style.lineHeight || style.fontSize + style.strokeThickness;
}

/**
 * @brief converts pattern <{spritename}> into text-inserted sprite from symbols.spritename
 */
export default class CoaText extends Text {
	/**
	 * @param {string} text - The string that you would like the text to display
	 * @param {object|PIXI.TextStyle} [style] - The style parameters
	 * @param ?Object<PIXI.Texture> - list of textures to insert
	 * @param {HTMLCanvasElement} [canvas] - The canvas element for drawing text
	 */
	constructor(text, style, symbols = {}, canvas = null) {
		super(text, style, canvas);

		/**
		 * @brief
		 * @private
		 */
		this.symbols_ = symbols;
	}
	/**
	 * Render the text with letter-spacing with custom symbols support.
	 * @private
	 */
	drawLetterSpacing(text, x, y, isStroke = false) {
		const style = this._style;
		const letterSpacing = style.letterSpacing;
		const spaceWidth = this.context.measureText(' ').width + letterSpacing;

		const measured = TextMetrics.measureText(
			this._text || ' ',
			this._style,
			this._style.wordWrap,
			this.canvas
		);
		const lineHeight = measured.lineHeight;
		const ascent = measured.fontProperties.ascent;

		let reg = /\|{(\d+)\s*\|/g;
		let match;
		while ((match = reg.exec(this._text)) !== null) {
			let symbol = this.textIconsOrder_[match[1]];

			//replace template with transparent spaces
			const oldTextWidth =
				this.context.measureText(match[0]).width + letterSpacing * match[0].length;
			const spacesCount = Math.round(oldTextWidth / spaceWidth);

			const indexOfTemplate = text.indexOf(match[0]);
			const posOfTemplate =
				this.context.measureText(text.substring(0, indexOfTemplate)).width +
				letterSpacing * indexOfTemplate;

			const base = symbol.baseTexture;

			const scale = lineHeight / base.height;

			this.context.drawImage(
				base.source,
				x + posOfTemplate + oldTextWidth / 2 - (base.width * scale) / 2,
				y - ascent,
				base.width * scale,
				base.height * scale
			);

			text = text.replace(match[0], ' '.repeat(spacesCount));
		}

		super.drawLetterSpacing(text, x, y, isStroke);
	}

	/**
	 * Set the copy for the text object. To split a line you can use '\n'.
	 *
	 * @member {string}
	 */
	get text() {
		return this.textRaw_;
	}
	set text(text) {
		text = String(text === null || text === undefined ? '' : text);

		if (this.textRaw_ === text) {
			return;
		}

		this.dirty = true;

		if (!text.match(/<{\w+}>/)) {
			this.textRaw_ = this._text = text;
			return;
		}

		/**
		 * @brief original text without removed icons patterns
		 * @private
		 */
		this.textRaw_ = text;
		/**
		 * @brief
		 * @type !Array<PIXI.Texture>
		 * @private
		 */
		this.textIconsOrder_ = [];

		//Replace all <{.*}> with spaces
		const style = this._style || { letterSpacing: 0 };
		const letterSpacing = style.letterSpacing;
		//width of one space for skip icons fills
		const spaceWidth = this.context.measureText(' ').width + letterSpacing;
		const measured = TextMetrics.measureText(
			this._text || ' ',
			this._style,
			this._style.wordWrap,
			this.canvas
		);
		const lineHeight = measured.lineHeight;

		let reg = /<{(\w+)}>/g;
		let match;
		let oldText = text;
		while ((match = reg.exec(oldText)) !== null) {
			let symbol = this.symbols_[match[1]];
			console.log(match);
			if (!symbol) continue;

			const iconWidth = (lineHeight / symbol.baseTexture.height) * symbol.baseTexture.width;

			//So we do here three things:
			//1. Saving info about what icons where placed (whis its number)
			//2. Replacing original reference with text exacts width with icon
			//3. Making some weird symbols sequence to avoid possible misstyping
			let newSymbol = `|{${this.textIconsOrder_.length}`;

			const newTextWidth =
				this.context.measureText(newSymbol).width + letterSpacing * newSymbol.length;
			//additional symbols to make required length
			const fillsCount = Math.round(Math.max(0, (iconWidth - newTextWidth) / spaceWidth));
			newSymbol += ' '.repeat(fillsCount) + '|';

			text = text.replace(match[0], newSymbol);
			this.textIconsOrder_.push(symbol);
		}

		this._text = text;
	}
}
