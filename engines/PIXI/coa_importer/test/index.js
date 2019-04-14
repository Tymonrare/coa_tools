/** @format */

import * as PIXI from 'pixi.js';
import loader from '@lib/loader.js';
import ui from '@lib/ui/index.js';

import '@res/style.css';

const width = 1280;
const height = 720;

var app = new PIXI.Application(width, height, { backgroundColor: 0x1099bb });
document.body.appendChild(app.view);

loader('/res/samples/', require('@res/samples/test.json')).then((conf) => {
	let fontTest = {
		test_style1: {
			fontSize: 30,
			fill: '#ff0000'
		}
	};
	let testIcon = PIXI.Texture.from('res/develop.png');
	let wind = new ui(conf, {
		debugTree: true,
		debugBounds: true,
		fonts: fontTest,
		customTextSymbols: { testIcon }
	});
	wind.setPosition(width / 2, height / 2);

	let ws = conf.scene.size[0] / width;
	let hs = conf.scene.size[1] / height;
	wind.scale.set(ws > hs ? ws : hs);

	app.stage.addChild(wind);

	//test binds
	{
		let binds = wind.gbinds;
		setInterval(function() {
			binds.progress1 = Math.abs(Math.sin(new Date().getTime() / 5000));
			binds.progress2 = Math.abs(Math.sin(new Date().getTime() / 5000));
			binds.progress3 = Math.abs(Math.sin(new Date().getTime() / 5000));
		}, 30);
		binds.test_bind1 = 'text <{testIcon}> <{EMPTY}>';

		let texture = PIXI.Texture.from('res/flat_128.png');
		binds.test_bind2 = texture;

		let handler = {
			$elementCreated: function(el) {
				el.tint = Math.random() * 16777215;
			}
		};
		binds.test_bind4 = [handler, handler];
		binds.test_bind4.push(handler);

		wind.gnodes.test_bind5._instantUpdate = true;
		binds.test_bind5 = [true, true, true];
		//test redraw
		let arr = Array.from({ length: 10 }, () => {
			return true;
		});
		binds.test_bind5 = arr;
		//if you want access to new children instantly, set _instantUpdate
		//;console.log(wind.gnodes.test_bind5.contentContainer.children); //already awaible

		let bind6arr = [];
		for (let i = 0; i < 60; i++) {
			bind6arr.push({ test_nested1: 'text' + i, test_nested2: texture });
		}
		binds.test_bind6 = bind6arr;

		binds.test_bind7 = [true, true, true];
		
		binds.test_bind8 = binds.test_bind9 = Array.from({ length: 10 }, () => {
			return true;
		});
	}

	//text button label
	wind.nodes.tab1_btn.label = 'Tab 1';

	//test btn
	wind.close_btn.binding = () => {
		console.log('close window');
	};
	wind.gnodes.test_disabled_btn.interactive = false;

	{
		let child = wind.gnodes.test_bind1;
		//child.parent.removeChild(child);
		let node = child.node;
		for (let i = 1; i < 3; i++) {
			let obj = child.parent.addNodeClone(node);
			obj.position.y += 100 * i;
		}
	}

	//all containers redraws only on next frame
	requestAnimationFrame(() => {
		//redraw bounds after nodes recreated
		//wind.debugBoundsDraw_();
	});
});
