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
	let wind = new ui(conf);
	wind.setPosition(width / 2, height / 2);

	let ws = conf.scene.size[0] / width;
	let hs = conf.scene.size[1] / height;
	wind.scale.set(ws > hs ? ws : hs);

	app.stage.addChild(wind);

	{
		let binds = wind.gbinds;
		console.log(wind.gnodes.progress1);
		setInterval(function() {
			binds.progress1 = Math.abs(Math.sin(new Date().getTime() / 5000));
			binds.progress2 = Math.abs(Math.sin(new Date().getTime() / 5000));
			binds.progress3 = Math.abs(Math.sin(new Date().getTime() / 5000));
		}, 30);
		binds.test_bind1 = 'text text';

		let texture = PIXI.Texture.from('res/flat_128.png');
		binds.test_bind2 = texture;

		//WARNING:
		//You can't push in your own array like:
		//let a = [];
		//binds.node = a;
		//a.push(true); //not gonna work
		binds.test_bind4 = [true, true, true];
		binds.test_bind4.push(true);

		wind.gnodes.test_bind5._instantUpdate = true;
		binds.test_bind5 = [true, true, true];
		//test redraw
		let arr = Array.from({length:30}, ()=>{return true})
		binds.test_bind5 = arr
		//if you want access to new children instantly, set _instantUpdate
		//;console.log(wind.gnodes.test_bind5.contentContainer.children); //already awaible

		let bind6arr = [];
		for (let i = 0; i < 60; i++) {
			bind6arr.push({ test_nested1: 'text' + i, test_nested2: texture });
		}
		binds.test_bind6 = bind6arr;
	}

	//test btn
	wind.close_btn.binding = () => {
		console.log('close window');
	};

	{
		let child = wind.gnodes.test_bind1;
		//child.parent.removeChild(child);
		let node = child.node;
		for (let i = 1; i < 3; i++) {
			let obj = child.parent.addNodeClone(node);
			obj.position.y += 100 * i;
		}
	}

	console.log(wind);
});
